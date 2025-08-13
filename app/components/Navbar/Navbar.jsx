'use client';

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const navItems = [
  {
    label: 'About Us',
    href: '/about',
    children: [
      { label: 'Vision & Mission', href: 'https://raceinnovations.in/about-us/vision-mission' },
      { label: 'Management Team', href: 'https://raceinnovations.in/about-us/management-team' },
    ],
  },
  {
    label: 'Products',
    href: '/products',
    children: [
      { label: 'Technic', href: 'https://raceinnovations.in/technic' },
      { label: 'Intellect', href: 'https://raceinnovations.in/intellect' },
      { label: 'Connect', href: 'https://raceinnovations.in/connect' },
      { label: 'LBI Route Survey', href: 'https://raceinnovations.in/intellect/lbi' },
      { label: 'Accounting & Legal', href: 'https://raceinnovations.in/accounting-and-legal' },
    ],
  },
  {
    label: 'Reports',
    href: '/reports',
    children: [
      { label: 'Market Report', href: 'https://raceinnovations.in/market-report' },
      { label: 'Product Report', href: 'https://raceinnovations.in/product' },
      { label: 'Strategic Report', href: 'https://raceinnovations.in/strategic-report' },
      { label: 'Flash Report', href: 'https://raceinnovations.in/flash-reports' },
    ],
  },
  { label: 'Investors', href: 'https://raceinnovations.in/about-us/investors' },
  { label: 'Funding', href: 'https://raceinnovations.in/partner' },
  { label: 'IT Services', href: 'https://raceinnovations.in/it', highlight: 'red' },
  { label: 'ODC Logistics', href: 'https://raceinnovations.in/logistics' },
];

export default function Navbar() {
  return (
    <Disclosure as="nav" className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-10xl px-3 sm:px-6 lg:px-8">
            {/* extra left padding on mobile so logo doesn't sit under hamburger */}
            <div className="relative flex h-16 items-center justify-between pl-12 lg:pl-0">
              {/* Mobile menu button */}
              <div className="absolute inset-y-0 left-0 flex items-center lg:hidden">
                <DisclosureButton className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </DisclosureButton>
              </div>

              {/* Logo (bigger now) */}
              <div className="flex items-center justify-center lg:justify-start">
                <Link href="https://raceinnovations.in/" className="flex items-center">
                  <img
                    className="h-10 w-auto lg:h-12"
                    src="/images/logo.png"
                    alt="Race logo"
                  />
                </Link>
              </div>

              {/* Desktop nav (slightly larger font) */}
              <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
                <ul className="flex items-center gap-12">
                  {navItems.map((item) => {
                    if (item.children?.length) {
                      return (
                        <li key={item.label} className="relative">
                          <Menu as="div" className="relative inline-block text-left">
                            <MenuButton className="flex items-center gap-3 text-[17px] lg:text-[18px] font-bold text-blue-800 hover:text-blue-900 focus:outline-none">
                              <span>{item.label}</span>
                              <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                            </MenuButton>

                            <MenuItems className="absolute left-0 z-50 mt-3 w-64 origin-top-left rounded-xl bg-white p-2 shadow-lg outline-none">
                              {item.children.map((c) => (
                                <MenuItem key={c.label}>
                                  {({ active }) => (
                                    <Link
                                      href={c.href}
                                      className={`block rounded-md px-4 py-2.5 text-[16px] text-gray-700 ${
                                        active ? 'bg-gray-50' : ''
                                      } focus:outline-none`}
                                    >
                                      {c.label}
                                    </Link>
                                  )}
                                </MenuItem>
                              ))}
                            </MenuItems>
                          </Menu>
                        </li>
                      );
                    }

                    const shiny = item.highlight === 'red';
                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className={`text-[17px] lg:text-[18px] font-bold ${
                            shiny
                              ? 'text-red-600 hover:text-red-700 shining'
                              : 'text-blue-800 hover:text-blue-900'
                          } focus:outline-none`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Right actions */}
              <div className="hidden lg:flex lg:items-center lg:gap-3">
                <Link
                  href="/corporate-profile"
                  className="rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none"
                >
                  Corporate Profile
                </Link>
                <button
                  type="button"
                  aria-label="Call"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black ring-1 ring-gray-300 hover:bg-gray-50 focus:outline-none"
                >
                  <PhoneIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile panel (fixed under the header) */}
          <DisclosurePanel
            className="
              lg:hidden
              fixed inset-x-0 top-16
              z-40
              max-h-[calc(100vh-64px)] overflow-y-auto
              border-t border-gray-200
              bg-white/95 backdrop-blur-sm shadow-md
            "
          >
            <div className="space-y-1 px-3 py-3">
              {navItems.map((item) =>
                item.children?.length ? (
                  <Disclosure key={item.label} as="div" className="border-b last:border-none">
                    {({ open: subOpen }) => (
                      <>
                        <DisclosureButton className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[17px] font-semibold text-blue-800 hover:bg-gray-50 focus:outline-none">
                          <span>{item.label}</span>
                          <ChevronDownIcon
                            className={`h-5 w-5 transition-transform ${subOpen ? 'rotate-180' : ''}`}
                          />
                        </DisclosureButton>
                        <DisclosurePanel className="px-3 pb-2">
                          <ul className="ml-3 space-y-1">
                            {item.children.map((c) => (
                              <li key={c.label}>
                                <Link
                                  href={c.href}
                                  className="block rounded-md px-3 py-2 text-[16px] text-gray-700 hover:bg-gray-50 focus:outline-none"
                                >
                                  {c.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </DisclosurePanel>
                      </>
                    )}
                  </Disclosure>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`block rounded-md px-3 py-2 text-[17px] font-semibold ${
                      item.highlight === 'red'
                        ? 'text-red-600 shining hover:bg-gray-50'
                        : 'text-blue-800 hover:bg-gray-50'
                    } focus:outline-none`}
                  >
                    {item.label}
                  </Link>
                ),
              )}

              <div className="mt-2 flex items-center gap-3">
                <Link
                  href="/corporate-profile"
                  className="flex-1 rounded-full bg-blue-700 px-5 py-2 text-center text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none"
                >
                  Corporate Profile
                </Link>
                <button
                  type="button"
                  aria-label="Call"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black ring-1 ring-gray-300 hover:bg-gray-50 focus:outline-none"
                >
                  <PhoneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </DisclosurePanel>

          {/* Shining animation */}
          <style jsx global>{`
            .shining {
              position: relative;
              display: inline-block;
              color: currentColor;
              -webkit-text-fill-color: currentColor;
              -webkit-mask-image: linear-gradient(
                -75deg,
                black 50%,
                rgba(255, 255, 255, 0.1) 50%,
                black 60%
              );
              -webkit-mask-size: 200%;
              mask-image: linear-gradient(
                -75deg,
                black 50%,
                rgba(255, 255, 255, 0.1) 50%,
                black 60%
              );
              mask-size: 200%;
              animation: shine 2s infinite linear;
            }
            @keyframes shine {
              from {
                -webkit-mask-position: 150%;
                mask-position: 150%;
              }
              to {
                -webkit-mask-position: -50%;
                mask-position: -50%;
              }
            }
          `}</style>
        </>
      )}
    </Disclosure>
  );
}
