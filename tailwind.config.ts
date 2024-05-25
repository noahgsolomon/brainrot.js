/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    screens: {
      xs: "500px",
      sm: "640px",
      // => @media (min-width: 640px) { ... }

      md: "768px",
      // => @media (min-width: 768px) { ... }

      lg: "1024px",
      // => @media (min-width: 1024px) { ... }

      xl: "1280px",
      // => @media (min-width: 1280px) { ... }

      "2xl": "1536px",
      // => @media (min-width: 1536px) { ... }
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        coarse: { raw: "(pointer: coarse)" },
        fine: { raw: "(pointer: fine)" },
      },
      colors: {
        pastelBlue: "hsl(var(--pastel-blue))",
        pastelPurple: "hsl(var(--pastel-purple))",
        pastelRed: "hsl(var(--pastel-red))",
        pastelYellow: "hsl(var(--pastel-yellow))",
        sticky: "hsl(var(--sticky))",
        english: "hsl(var(--english))",
        math: "hsl(var(--math))",
        science: "hsl(var(--science))",
        history: "hsl(var(--history))",
        arts: "hsl(var(--arts))",
        music: "hsl(var(--music))",
        literature: "hsl(var(--literature))",
        geography: "hsl(var(--geography))",
        philosophy: "hsl(var(--philosophy))",
        socialStudies: "hsl(var(--social-studies))",
        physicalEducation: "hsl(var(--physical-education))",
        computerScience: "hsl(var(--computer-science))",
        economics: "hsl(var(--economics))",
        businessStudies: "hsl(var(--business-studies))",
        psychology: "hsl(var(--psychology))",
        law: "hsl(var(--law))",
        politicalScience: "hsl(var(--political-science))",
        environmentalScience: "hsl(var(--environmental-science))",
        engineering: "hsl(var(--engineering))",
        medicine: "hsl(var(--medicine))",
        agriculture: "hsl(var(--agriculture))",
        astronomy: "hsl(var(--astronomy))",
        rick: "hsl(var(--rick))",
        patrick: "hsl(var(--patrick))",
        mrburns: "hsl(var(--mrburns))",
        bender: "hsl(var(--bender))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        blob1: "hsl(var(--blob1))",
        blob2: "hsl(var(--blob2))",
        blob3: "hsl(var(--blob3))",
        lightBlue: "hsl(var(--light-blue))",
        blue: "hsl(var(--blue))",
        brain: {
          DEFAULT: "hsl(var(--brain))",
          foreground: "hsl(var(--brain-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        common: {
          DEFAULT: "hsl(var(--common))",
          foreground: "hsl(var(--common-foreground))",
        },
        uncommon: {
          DEFAULT: "hsl(var(--uncommon))",
          foreground: "hsl(var(--uncommon-foreground))",
        },
        rare: {
          DEFAULT: "hsl(var(--rare))",
          foreground: "hsl(var(--rare-foreground))",
        },
        fish: {
          DEFAULT: "hsl(var(--fish))",
          foreground: "hsl(var(--fish-foreground))",
        },
        library: {
          DEFAULT: "hsl(var(--library))",
          foreground: "hsl(var(--library-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        link: {
          DEFAULT: "hsl(var(--link))",
          hover: "hsl(var(--link-hover))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "0 0 5px rgba(0, 0, 0, 0.1)",
        DEFAULT: "0 0 10px rgba(0, 0, 0, 0.1)",
        md: "0 0 15px rgba(0, 0, 0, 0.1)",
        lg: "0 0 25px rgba(0, 0, 0, 0.1)",
        xl: "0 0 35px rgba(0, 0, 0, 0.1)",
        "2xl": "0 0 50px rgba(0, 0, 0, 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        grid: {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0)" },
        },
        gradient: {
          to: {
            backgroundPosition: "var(--bg-size) 0",
          },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
      animation: {
        gradient: "gradient 8s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        grid: "grid 60s linear infinite",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/container-queries"),
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};
