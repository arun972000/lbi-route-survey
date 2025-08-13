'use client';

import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gray-50 text-gray-700">
      {/* Decorative diagonal panels (subtle, like your image) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-1/4 -top-1/3 h-[140%] w-[70%] rotate-[35deg] rounded-3xl bg-gradient-to-b from-gray-100 to-gray-50 shadow-inner" />
        <div className="absolute -right-1/3 top-1/4 h-[140%] w-[60%] rotate-[35deg] rounded-3xl bg-gradient-to-b from-gray-100/80 to-gray-50/80" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-12 sm:py-14 lg:pt-16">
        {/* Top section */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Logo */}
          <div className="flex items-start justify-center lg:col-span-3 lg:justify-start">
            <img
              src="/images/logo_footer.png"
              alt="Race Innovations logo"
              className="h-45 w-auto"
            />
          </div>

          {/* Blurb */}
          <div className="lg:col-span-7">
            <p className="text-base leading-6 text-gray-500 sm:text-lg sm:leading-6">
              At Race Innovations, we are passionate about transforming ideas into impactful
              solutions. As trusted consultants, we partner with businesses to navigate complex
              challenges and deliver innovative strategies that drive success. Our team excels at
              designing and implementing custom solutions tailored to your unique needs, helping you
              stay ahead in a fast-paced world. With a focus on collaboration, creativity, and
              sustainability, we are dedicated to delivering results that empower growth and create
              lasting value for our clients.
            </p>
          </div>

          {/* Socials */}
          <div className="flex items-start justify-center lg:col-span-2 lg:justify-end">
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com"
                aria-label="Instagram"
                className="transition hover:opacity-80"
                target="_blank"
                rel="noreferrer"
              >
                {/* Instagram (outline) */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-pink-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>

              <a
                href="https://facebook.com"
                aria-label="Facebook"
                className="transition hover:opacity-80"
                target="_blank"
                rel="noreferrer"
              >
                {/* Simple Facebook glyph */}
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-blue-600" fill="currentColor" aria-hidden="true">
                  <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 4.99 3.66 9.13 8.44 9.94v-7.03H8.08v-2.9h2.36V9.41c0-2.33 1.39-3.62 3.52-3.62 1.02 0 2.09.18 2.09.18v2.29h-1.18c-1.16 0-1.52.72-1.52 1.46v1.76h2.59l-.41 2.9h-2.18V22c4.78-.81 8.44-4.95 8.44-9.94z" />
                </svg>
              </a>

              <a
                href="https://x.com"
                aria-label="X"
                className="transition hover:opacity-80"
                target="_blank"
                rel="noreferrer"
              >
                {/* X logo (simple) */}
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-black" fill="currentColor" aria-hidden="true">
                  <path d="M18.9 3H21l-6.73 7.7L22 21h-6.1l-4.77-5.71L5.6 21H3.5l7.2-8.23L2 3h6.2l4.33 5.21L18.9 3Zm-2.12 16h1.6L7.34 5h-1.6l11.04 14Z" />
                </svg>
              </a>

              <a
                href="https://linkedin.com"
                aria-label="LinkedIn"
                className="transition hover:opacity-80"
                target="_blank"
                rel="noreferrer"
              >
                {/* LinkedIn */}
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#0A66C2]" fill="currentColor" aria-hidden="true">
                  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.44-2.14 2.93v5.68H9.36V9h3.41v1.56h.05c.48-.9 1.66-1.85 3.42-1.85 3.66 0 4.34 2.41 4.34 5.55v6.19ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM3.57 20.45h3.55V9H3.57v11.45Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 grid grid-cols-3 items-center">
          <div className="hidden sm:block" />
          <p className="col-span-3 text-center text-sm text-gray-600 sm:col-span-1">
            © {year} Race Innovations — All Rights Reserved
          </p>
          <nav className="col-span-3 mt-4 flex items-center justify-center gap-8 text-sm font-medium text-gray-700 sm:col-span-1 sm:mt-0 sm:justify-end">
            <Link href="/about" className="hover:text-blue-800">About Us</Link>
            <Link href="/careers" className="hover:text-blue-800">Careers</Link>
            <Link href="/contact" className="hover:text-blue-800">Contact</Link>
            <Link href="/investors" className="hover:text-blue-800">Investor</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
