import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { useState, useEffect } from "react";

import User from "./model/User";
import { fetchAllUsers } from "./utils/managementUtils";
import AppMenu from "./components/appMenu";
import UserMenu from "./components/userMenu";
import Routing from "./components/routing";

function App() {
  return (
    <Authenticator>
      <AppContent />
    </Authenticator>
  );
}

function AppContent() {
  const { user, signOut } = useAuthenticator();

  const version = "0.5.0";
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
        <div>Trwa uruchamianie aplikacji...</div>
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

      <div style={{ clear: 'both' }} />

      <Routing allUsers={allUsers} />
    </main>
  );
}

export default App;