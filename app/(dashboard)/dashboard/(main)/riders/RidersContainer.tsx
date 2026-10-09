"use client";

import React, { useState } from "react";
import RidersBoard from "./RidersBoard";
import DispatcherBoard from "./DispatcherBoard";

export default function RidersContainer() {
  const [activeTab, setActiveTab] = useState<"dispatcher" | "riders">("dispatcher");

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 bg-[#F8FAFB]">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex gap-4">
        <button
          onClick={() => setActiveTab("dispatcher")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === "dispatcher" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Dispatcher Board
        </button>
        <button
          onClick={() => setActiveTab("riders")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === "riders" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Manage Riders
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === "dispatcher" ? <DispatcherBoard /> : <RidersBoard />}
      </div>
    </div>
  );
}
