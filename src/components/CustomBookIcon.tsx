import React from 'react';
import Image from 'next/image';

export function CustomBookIcon() {
  return (
    <div className="p-2"> {/* Add padding here */}
      <Image
        src="/AppIcon.svg"
        alt="App Icon"
        width={36}
        height={36}
      />
    </div>
  );
}