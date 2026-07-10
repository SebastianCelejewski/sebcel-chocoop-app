import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { useState, useEffect } from "react";

import User from "./model/User";
import { fetchAllUsers } from "./utils/managementUtils";
import AppMenu from "./components/appMenu";
import UserMenu from "./components/userMenu";
import Routing from "./components/routing";
import { dateToString, getCurrentDate } from "./utils/dateUtils";
import { signIn } from "aws-amplify/auth";

console.log("Env:" + import.meta.env.VITE_CHOCOOP_ENV);
console.log("Bus name: " + import.meta.env.VITE_EVENT_BUS_NAME);

function App() {
  return (
    <Authenticator
      services={{
        async handleSignIn(input) {
          return signIn({username: input.username, password: input.password, options: {authFlowType: "USER_PASSWORD_AUTH"}});
        }
      }}
    >
      <AppContent />
    </Authenticator>
  );
}

function AppContent() {
  const { user, signOut } = useAuthenticator();

  const version = "0.5.5";
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Map<string, User> | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchAllUsers().then(setAllUsers);

    fetchUserAttributes().then((attributes) => {
      setUserNickname(attributes.nickname ?? "");
    });
  }, [user]);

  if (!user || userNickname === null || allUsers === null) {
    return (
      <>
        <h1>Chores Cooperative</h1>
        <p className="versionInfo">{version}</p>
        <div>Ładowanie danych...</div>
      </>
    );
  }

  return (
    <main>
      <AppMenu />
      <UserMenu signoutFunction={signOut} />

      <h1>Chores Cooperative</h1>
      <p className="versionInfo">{version}</p>

      <div className="subheader">
        <p className="userInfo">
          Witaj, <span data-testid="user-nickname" data-currentuserid={user.userId}>{userNickname}</span>
        </p>
      </div>

      <div className="currentDate">{dateToString(getCurrentDate())}</div>

      <div style={{ clear: 'both' }} />

      <Routing allUsers={allUsers} />
    </main>
  );
}

export default App;