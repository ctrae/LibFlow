export default function LibFlowDashboard() {
  return (
    <div className="min-h-screen bg-white flex flex-col text-[#2d3748] antialiased">
      {/* Main Container */}
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 flex flex-col bg-[#f4f5f9] min-w-0">
          <div className="px-9 pb-8">
            <h1 className="text-[32px] font-bold  text-[#0d0d0d] leading-tight">
              Sessions
            </h1>
            <p className="text-[#888ca0] text-[15px]  mt-1">
              Manage Your Library Sessions
            </p>
          </div>

          {/* Lower Section: Controls & Table */}
          <div className="flex-1 bg-white px-9 pt-8 pb-10">
            {/* Search and Filter Row */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative w-[265px] h-[44px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a0aec0]">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full h-full bg-[#f4f5f8] text-[14px] pl-10 pr-4 rounded-[4px] outline-none text-[#2d3748] placeholder-[#a0aec0]"
                />
              </div>

              {/* ID Dropdown */}
              <div className="w-[178px] h-[44px] border border-[#e2e8f0] rounded-[4px] px-4 flex items-center justify-between cursor-pointer text-[14px] text-[#4a5568] bg-white">
                <span>ID</span>
                <svg
                  className="w-4 h-4 text-[#718096]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Table Meta Controls Row */}
            <div className="flex items-center justify-between mt-6 mb-4">
              <div className="text-[14px] text-[#8a92a6]">
                Showing:{" "}
                <span className=" font-bold text-black text-[15px]">
                  8 Sessions
                </span>
              </div>

              <div className="flex items-center gap-6">
                {/* Hide Visited Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="w-4 h-4 rounded-[3px] bg-[#9c5127] flex items-center justify-center text-white">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-[#8a92a6] text-[14px]">
                    Hide Visited
                  </span>
                </label>

                {/* Show Empty Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="w-4 h-4 rounded-[3px] border border-[#cbd5e0] bg-white" />
                  <span className="text-[#a0aec0] text-[14px]">Show Empty</span>
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fdf3e7] h-[52px]">
                    <th className="px-6  font-bold text-[14px] text-[#8c6753] tracking-wide">
                      Student
                    </th>
                    <th className="px-6  font-bold text-[14px] text-[#8c6753] tracking-wide">
                      Check In
                    </th>
                    <th className="px-6  font-bold text-[14px] text-[#8c6753] tracking-wide">
                      Check Out
                    </th>
                    <th className="px-6  font-bold text-[14px] text-[#8c6753] tracking-wide">
                      Bags ID
                    </th>
                    <th className="px-6  font-bold text-[14px] text-[#8c6753] tracking-wide">
                      Zone
                    </th>
                    <th className="px-6  font-bold text-[14px] text-[#8c6753] tracking-wide">
                      Status
                    </th>
                    <th className="px-6  font-bold text-[14px] text-[#8c6753] tracking-wide text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#edf2f7] h-[64px] hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 text-[14px] text-[#4a5568]">
                      620627382
                    </td>
                    <td className="px-6 text-[14px] text-[#4a5568]">8:15Am</td>
                    <td className="px-6 text-[14px] text-[#4a5568]">9:30AM</td>
                    <td className="px-6 text-[14px] text-[#4a5568]">219384</td>
                    <td className="px-6 text-[14px] text-[#4a5568]">219384</td>
                    <td className="px-6 text-[14px] font-semibold text-[#ff3b30]">
                      Pending
                    </td>
                    <td className="px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Option Button */}
                        <button className="w-7 h-7 rounded-full bg-[#8a92a6] text-white flex items-center justify-center hover:bg-[#71788e] transition-colors">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>

                        {/* Speech Bubble Button */}
                        <button className="w-7 h-7 rounded-full bg-[#8a92a6] text-white flex items-center justify-center hover:bg-[#71788e] transition-colors">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
