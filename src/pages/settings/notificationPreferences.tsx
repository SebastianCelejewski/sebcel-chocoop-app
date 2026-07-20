import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

export interface NotificationPreferences {
    email: Record<string, boolean>;
}

export interface NotificationType {
    key: string;
    label: string;
    description: string;
    channels: string[];
}

const API_URL = import.meta.env.VITE_NOTIFICATIONS_API_URL;

const CHANNEL_LABELS: Record<string, string> = {
    email: "Email",
    push: "Push",
};

async function getIdToken(): Promise<string> {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? "";
}

async function fetchNotificationTypes(): Promise<NotificationType[]> {
    const res = await fetch(`${API_URL}/notification-types`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function fetchPreferences(): Promise<NotificationPreferences> {
    const token = await getIdToken();
    const res = await fetch(`${API_URL}/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function putPreferences(prefs: NotificationPreferences): Promise<void> {
    const token = await getIdToken();
    const res = await fetch(`${API_URL}/preferences`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

function buildDefaultPrefs(types: NotificationType[]): NotificationPreferences {
    const email: Record<string, boolean> = {};
    for (const t of types) {
        if (t.channels.includes("email")) email[t.key] = true;
    }
    return { email };
}

function mergePrefs(
    defaults: NotificationPreferences,
    loaded: NotificationPreferences
): NotificationPreferences {
    return {
        email: { ...defaults.email, ...loaded.email },
    };
}

interface ToggleProps {
    checked: boolean;
    disabled?: boolean;
    onChange: () => void;
}

function Toggle({ checked, disabled, onChange }: ToggleProps) {
    return (
        <div
            className={`notifPrefToggle ${checked ? "notifPrefToggleOn" : ""} ${disabled ? "notifPrefToggleDisabled" : ""}`}
            role="checkbox"
            aria-checked={checked}
            aria-disabled={disabled}
            onClick={disabled ? undefined : onChange}
        >
            <div className="notifPrefThumb" />
        </div>
    );
}

interface Props {
    onClose: () => void;
}

type LoadStatus = "loading" | "loadError" | "ready" | "saving" | "saved";

function NotificationPreferencesPanel({ onClose }: Props) {
    const [types, setTypes] = useState<NotificationType[]>([]);
    const [allChannels, setAllChannels] = useState<string[]>([]);
    const [prefs, setPrefs] = useState<NotificationPreferences>({ email: {} });
    const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
    const [loadError, setLoadError] = useState("");
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        Promise.all([fetchNotificationTypes(), fetchPreferences()])
            .then(([fetchedTypes, fetchedPrefs]) => {
                const channels = [...new Set(fetchedTypes.flatMap(t => t.channels))];
                const defaults = buildDefaultPrefs(fetchedTypes);
                setTypes(fetchedTypes);
                setAllChannels(channels);
                setPrefs(mergePrefs(defaults, fetchedPrefs));
                setLoadStatus("ready");
            })
            .catch(e => {
                setLoadError(e.message);
                setLoadStatus("loadError");
            });
    }, []);

    useEffect(() => {
        if (loadStatus === "saved") {
            const t = setTimeout(() => setLoadStatus("ready"), 2000);
            return () => clearTimeout(t);
        }
    }, [loadStatus]);

    function toggle(channel: string, key: string) {
        if (loadStatus === "loading" || loadStatus === "saving") return;
        setPrefs(prev => {
            const channelPrefs: Record<string, boolean> = (prev as unknown as Record<string, Record<string, boolean>>)[channel] ?? {};
            return {
                ...prev,
                [channel]: { ...channelPrefs, [key]: !channelPrefs[key] },
            };
        });
        setSaveError("");
    }

    async function handleSave() {
        setLoadStatus("saving");
        setSaveError("");
        try {
            await putPreferences(prefs);
            setLoadStatus("saved");
        } catch (e: any) {
            setSaveError(e.message);
            setLoadStatus("ready");
        }
    }

    const isChannelImplemented = (channel: string) => channel === "email";

    return (
        <div className="notifPrefOverlay" onClick={onClose}>
            <div className="notifPrefPanel" onClick={e => e.stopPropagation()}>
                <div className="notifPrefHeader">
                    <span>Preferencje powiadomień</span>
                    <button className="notifPrefClose" onClick={onClose}>✕</button>
                </div>

                {loadStatus === "loading" && (
                    <div className="notifPrefLoading">Ładowanie...</div>
                )}

                {loadStatus === "loadError" && (
                    <div className="notifPrefError">Błąd ładowania: {loadError}</div>
                )}

                {loadStatus !== "loading" && loadStatus !== "loadError" && (
                    <>
                        <div className="notifPrefChannelRow">
                            <div className="notifPrefChannelSpacer" />
                            {allChannels.map(channel => (
                                <span
                                    key={channel}
                                    className={`notifPrefChannelLabel ${!isChannelImplemented(channel) ? "notifPrefChannelDisabled" : ""}`}
                                >
                                    {CHANNEL_LABELS[channel] ?? channel}
                                    {!isChannelImplemented(channel) && <><br /><span className="notifPrefChannelSoon">wkrótce</span></>}
                                </span>
                            ))}
                        </div>

                        <ul className="notifPrefList">
                            {types.map(({ key, label, description, channels }) => (
                                <li key={key} className="notifPrefItem">
                                    <div className="notifPrefItemText">
                                        <span className="notifPrefItemLabel">{label}</span>
                                        <span className="notifPrefItemDesc">{description}</span>
                                    </div>
                                    {allChannels.map(channel => (
                                        <Toggle
                                            key={channel}
                                            checked={!!prefs[channel as keyof NotificationPreferences]?.[key]}
                                            disabled={!isChannelImplemented(channel) || !channels.includes(channel)}
                                            onChange={() => toggle(channel, key)}
                                        />
                                    ))}
                                </li>
                            ))}
                        </ul>

                        <div className="notifPrefFooter">
                            {loadStatus === "saved" && <span className="notifPrefSavedMsg">Zapisano</span>}
                            {saveError && <span className="notifPrefErrorMsg">Błąd: {saveError}</span>}
                            <button onClick={handleSave} disabled={loadStatus === "saving"}>
                                {loadStatus === "saving" ? "Zapisywanie..." : "Zapisz"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default NotificationPreferencesPanel;
