import React from "react";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white m-0 p-0 select-none">
      {children}
    </div>
  );
}
