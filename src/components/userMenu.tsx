import { useState } from "react";

import userMenuIcon from "../assets/images/menu/userMenu.png?url";
import NotificationPreferencesPanel from "../pages/settings/notificationPreferences";

function UserMenu({ signoutFunction }: { signoutFunction?: (data?: any) => void }) {
    const [userMenuExpanded, setUserMenuExpanded] = useState(false);
    const [showNotifPrefs, setShowNotifPrefs] = useState(false);

    return (
        <>
            <div className="userMenu">
                <img src={userMenuIcon} alt="menu" onClick={() => setUserMenuExpanded(v => !v)} />
                {userMenuExpanded && (
                    <ul className="userMenuDropdown">
                        <li>
                            <a onClick={() => { setShowNotifPrefs(true); setUserMenuExpanded(false); }}>
                                Preferencje powiadomień
                            </a>
                        </li>
                        <li>
                            <a className="logoutButton" onClick={() => { signoutFunction?.(); setUserMenuExpanded(false); }}>
                                Wyloguj
                            </a>
                        </li>
                    </ul>
                )}
            </div>
            {showNotifPrefs && (
                <NotificationPreferencesPanel onClose={() => setShowNotifPrefs(false)} />
            )}
        </>
    );
}

export default UserMenu;
