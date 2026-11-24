export default function Dashboard() {
  return (
    <div className="min-h-screen text-[#2C221E] flex flex-col selection:bg-[#9B4531] selection:text-white">
      <div className="flex flex-1">
        {/* Main Content Area */}
        <main className="flex-1 space-y-8 mx-auto">
          {/* Header Title */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9B4531] uppercase">
              FRIDAY, NOVEMBER 20, 2026
            </p>
            <h1 className="text-4xl font-bold text-[#2C221E] mt-1">
              Welcome, Head.
            </h1>
            <p className="text-sm text-[#7D6E62] mt-1">
              Live library activity from registered visits.
            </p>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Active sessions
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  0
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Currently active
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Main section
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H7m4 0V7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  0
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Active sessions
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Basement
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  0
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Active sessions
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Visits today
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  0
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Registered today
                </p>
              </div>
            </div>
          </div>

          {/* Main Dashboard Layout (2 Columns) */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column (Chart & Activity) */}
            <div className="col-span-8 space-y-6">
              {/* Recent visit registrations */}
              <div className="bg-white p-6 shadow-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#9B4531]"></span>
                  <h3 className="font-bold text-[#2C221E] text-base">
                    Recent visit registrations
                  </h3>
                </div>
                <p className="text-xs text-[#7D6E62] mt-0.5">
                  Visits created during the last 12 hours
                </p>

                {/* Graph Container */}
                <div className="mt-6 border border-[#E3D7C7]/70 rounded-xl bg-[#F5EFE6]/50 h-[220px] flex flex-col justify-end p-4">
                  <div className="w-full border-b border-[#E3D7C7]/60 pb-2 flex justify-between text-[11px] text-[#8C7C6D]">
                    <span>12h ago</span>
                    <span>10h</span>
                    <span>8h</span>
                    <span>6h</span>
                    <span>4h</span>
                    <span>2h</span>
                    <span>Now</span>
                  </div>
                </div>
              </div>

              {/* Recent visit activity */}
              <div className="bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#2C221E] text-base">
                      Recent visit activity
                    </h3>
                    <p className="text-xs text-[#7D6E62] mt-0.5">
                      Registered student sessions
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1 bg-[#EBE0D3] p-1 rounded-full text-xs">
                    <button className="bg-[#2C221E] text-white px-3 py-1 rounded-full font-medium">
                      All activity
                    </button>
                    <button className="text-[#6E5E52] px-3 py-1 rounded-full hover:text-[#2C221E] transition-colors">
                      Entry
                    </button>
                    <button className="text-[#6E5E52] px-3 py-1 rounded-full hover:text-[#2C221E] transition-colors">
                      Exit
                    </button>
                    <button className="text-[#6E5E52] px-3 py-1 rounded-full hover:text-[#2C221E] transition-colors">
                      Zone transition
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll bar / Table Preview */}
                <div className="border-t border-[#E3D7C7]/60 pt-3 flex items-center justify-between">
                  <button className="text-[#7D6E62] hover:text-[#2C221E]">
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
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <div className="flex-1 mx-4 h-1.5 bg-[#EBE0D3] rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-[#9B4531] rounded-full"></div>
                  </div>

                  <button className="text-[#7D6E62] hover:text-[#2C221E]">
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column (QR & Zone Occupancy) */}
            <div className="col-span-4 space-y-6">
              {/* Student Check-in QR */}
              <div className="bg-white p-6 shadow-sm space-y-3">
                <p className="text-[11px] font-bold text-[#9B4531] tracking-wider uppercase">
                  STUDENT CHECK-IN QR
                </p>
                <div className="flex items-start space-x-4">
                  {/* QR Code SVG Placeholder */}
                  <div className="w-20 h-20 bg-white p-1.5 rounded-lg border border-[#E3D7C7] flex-shrink-0">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full fill-[#2C221E]"
                    >
                      <rect x="0" y="0" width="30" height="30" />
                      <rect x="5" y="5" width="20" height="20" fill="white" />
                      <rect x="10" y="10" width="10" height="10" />

                      <rect x="70" y="0" width="30" height="30" />
                      <rect x="75" y="5" width="20" height="20" fill="white" />
                      <rect x="80" y="10" width="10" height="10" />

                      <rect x="0" y="70" width="30" height="30" />
                      <rect x="5" y="75" width="20" height="20" fill="white" />
                      <rect x="10" y="80" width="10" height="10" />

                      <rect x="40" y="10" width="10" height="10" />
                      <rect x="50" y="20" width="10" height="20" />
                      <rect x="10" y="40" width="20" height="10" />
                      <rect x="40" y="40" width="20" height="20" />
                      <rect x="70" y="40" width="20" height="10" />
                      <rect x="80" y="60" width="10" height="20" />
                      <rect x="40" y="70" width="10" height="20" />
                      <rect x="60" y="80" width="30" height="10" />
                    </svg>
                  </div>

                  <p className="text-xs text-[#6E5E52] leading-relaxed">
                    Place this at the entrance for students to register a visit.
                  </p>
                </div>

                <a
                  href="#"
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-[#9B4531] hover:underline pt-1"
                >
                  <span>Open registration page</span>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </a>
              </div>

              {/* Zone Occupancy */}
              <div className="bg-white p-6 shadow-sm space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#2C221E] text-base">
                      Zone occupancy
                    </h3>
                    <button className="text-[#8C7C6D] hover:text-[#2C221E]">
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
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[#7D6E62] mt-0.5">
                    Current active sessions by area
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-[#2C221E]">
                      <span>Main section</span>
                      <span>0</span>
                    </div>
                    <div className="w-full h-2 bg-[#EBE0D3] rounded-full overflow-hidden">
                      <div className="w-0 h-full bg-[#9B4531] rounded-full"></div>
                    </div>
                    <p className="text-[11px] text-[#8C7C6D]">
                      0% of active sessions
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-medium text-[#2C221E]">
                      <span>Basement</span>
                      <span>0</span>
                    </div>
                    <div className="w-full h-2 bg-[#EBE0D3] rounded-full overflow-hidden">
                      <div className="w-0 h-full bg-[#9B4531] rounded-full"></div>
                    </div>
                    <p className="text-[11px] text-[#8C7C6D]">
                      0% of active sessions
                    </p>
                  </div>
                </div>

                <button className="w-full py-2.5 rounded-full border border-[#DCD0C0] text-xs font-semibold text-[#2C221E] hover:bg-[#EBE0D3]/50 transition-colors flex items-center justify-center space-x-1.5 mt-2">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 17L17 7M17 7H7M17 7V17"
                    />
                  </svg>
                  <span>View live sessions</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Floating Bottom Right Button */}
      <div className="fixed bottom-6 right-6">
        <button className="w-10 h-10 rounded-full bg-[#2C221E] text-white font-bold text-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
          N
        </button>
      </div>
    </div>
  );
}
