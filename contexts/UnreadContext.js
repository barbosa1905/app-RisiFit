import React, { createContext, useState } from 'react';

export const UnreadContext = createContext();

export const UnreadProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <UnreadContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </UnreadContext.Provider>
  );
};
