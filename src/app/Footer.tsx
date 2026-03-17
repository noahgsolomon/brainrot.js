import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TwitterLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const footerNavs = [
  {
    label: "Product",
    items: [
      {
        href: "/",
        name: "Create Video",
      },
      {
        href: "/credits",
        name: "Credits",
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        href: "/blog",
        name: "Blog",
      },
      {
        href: "https://github.com/noahgsolomon/brainrot.js",
        name: "GitHub",
      },
    ],
  },
  {
    label: "Legal",
    items: [
      {
        href: "/privacy",
        name: "Privacy Policy",
      },
      {
        href: "/terms",
        name: "Terms of Service",
      },
    ],
  },
];

const footerSocials = [
  {
    href: "https://github.com/noahgsolomon/brainrot.js",
    name: "GitHub",
    icon: <GitHubLogoIcon className="size-4" />,
  },
  {
    href: "https://twitter.com/noahgsolomon",
    name: "Twitter",
    icon: <TwitterLogoIcon className="size-4" />,
  },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t bg-card">
      <div className="mx-auto w-full max-w-screen-xl px-4">
        <div className="gap-4 p-4 py-16 sm:pb-16 md:flex md:justify-between">
          <div className="mb-12 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/brainrot_new2.png"
                width={32}
                height={32}
                alt="Brainrot.js logo"
              />
              <span className="self-center whitespace-nowrap text-2xl font-semibold dark:text-white">
                Brainrot.js
              </span>
            </Link>
            <div className="max-w-sm">
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                AI-powered brainrot video generator. Create viral content with
                celebrity voices and AI dialogue.
              </p>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: "default",
                  }),
                  "group mt-4 w-full whitespace-nowrap rounded-[2rem] px-6",
                )}
              >
                Get Started
                <ChevronRight className="ml-1 size-4 transition-all duration-300 ease-out group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {footerNavs.map((nav) => (
              <div key={nav.label}>
                <h2 className="mb-6 text-sm font-semibold uppercase text-gray-900 dark:text-white">
                  {nav.label}
                </h2>
                <ul className="grid gap-2">
                  {nav.items.map((item) => (
                    <li key={item.name}>
                      {item.href.startsWith("http") ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex cursor-pointer items-center justify-start gap-1 text-gray-400 duration-200 hover:text-gray-600 hover:opacity-90 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {item.name}
                          <ChevronRight className="h-4 w-4 translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="group inline-flex cursor-pointer items-center justify-start gap-1 text-gray-400 duration-200 hover:text-gray-600 hover:opacity-90 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {item.name}
                          <ChevronRight className="h-4 w-4 translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t py-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div className="flex space-x-5 sm:mt-0 sm:justify-center">
            {footerSocials.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="fill-gray-500 text-gray-500 hover:fill-gray-900 hover:text-gray-900 dark:hover:fill-gray-600 dark:hover:text-gray-600"
              >
                {social.icon}
                <span className="sr-only">{social.name}</span>
              </a>
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 sm:text-center">
            Copyright © {new Date().getFullYear()}{" "}
            <Link href="/" className="cursor-pointer">
              Brainrot.js
            </Link>
            . All Rights Reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
