"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import toolsData from "@/app/env/tools.json";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const readyTools = toolsData.filter((tool) => tool.status === "ready");

  return (
    <section>
      <header className="flex items-center justify-between p-4 border-b border-gray-300 bg-white shadow-md rounded-lg lg:px-8">
        {/* Back button with icon */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center text-pink-500 hover:text-pink-700 font-semibold transition"
        >
          <FiArrowLeft className="mr-2" />
          Back
        </button>

        {/* Navigation menu for tools */}
        <nav className="flex space-x-2 lg:space-x-6 overflow-x-auto">
          {readyTools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.path}
              className={`flex items-center px-3 py-1.5 rounded-md text-gray-700 font-medium transition ${
                pathname === tool.path
                  ? "bg-pink-500 text-white"
                  : "hover:bg-pink-100"
              }`}
            >
              <span className="mr-2 text-pink-500">{/* Place icon here if needed */}</span>
              {tool.name}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content area */}
      <div className="p-4">{children}</div>
    </section>
  );
}
