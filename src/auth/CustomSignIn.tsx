import { useState } from "react";
import { signIn } from "aws-amplify/auth";

export default function CustomSignIn() {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSignIn(event: React.FormEvent) {

        event.preventDefault();

        setErrorMessage("");
        setIsLoading(true);

        try {

            await signIn({
                username,
                password,
                options: {
                    authFlowType: "USER_PASSWORD_AUTH"
                }
            });

        } catch (error) {

            console.error("Sign in failed", error);

            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Unknown error");
            }

        } finally {

            setIsLoading(false);

        }
    }

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "100px"
            }}
        >
            <form
                onSubmit={handleSignIn}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "320px",
                    gap: "12px"
                }}
            >

                <h2>Sign in</h2>

                <input
                    type="email"
                    placeholder="Email"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                />

                <button
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? "Signing in..." : "Sign in"}
                </button>

                {
                    errorMessage &&
                    (
                        <div
                            style={{
                                color: "red"
                            }}
                        >
                            {errorMessage}
                        </div>
                    )
                }

            </form>
        </div>
    );
}