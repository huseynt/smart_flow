"use client";

import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded flex items-center justify-center">
        <Image src="/bravologo.png" alt="Logo" width={50} height={50} className="w-10 h-10"/>
      </div>
      <span className="font-bold text-lg text-[#75ba4b] hidden sm:inline">
        Bravo Smart Flow
      </span>
    </div>
  );
}
