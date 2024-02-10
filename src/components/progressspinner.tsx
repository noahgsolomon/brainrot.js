import { motion } from "framer-motion";

export default function ProgressSpinner({
  progress = 0,
  className,
}: {
  progress: number;
  className?: string;
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokePercent = Math.min(Math.max(progress, 0), 100);

  // Animation for the progress circle
  const progressVariants = {
    initial: { strokeDashoffset: circumference },
    animate: {
      strokeDashoffset: circumference - (strokePercent / 100) * circumference,
    },
  };

  return (
    <svg
      className={className}
      fill="none"
      height="32"
      width="32"
      viewBox="0 0 100 100"
    >
      <motion.circle
        cx="50"
        cy="50"
        r={radius}
        strokeWidth="10"
        strokeDashoffset="0"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-secondary"
      />
      <motion.circle
        className={`progress-circle ${
          progress === 100 ? "stroke-success" : "stroke-blue"
        }`}
        cx="50"
        cy="50"
        r={radius}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={circumference}
        initial="initial"
        animate="animate"
        variants={progressVariants}
        transition={{
          duration: 0.5, // Duration of the animation
          ease: "easeInOut",
        }}
      />
      <motion.text
        x="50"
        y="52" // Adjusted for better centering
        className="fill-primary text-3xl font-semibold"
        alignmentBaseline="middle"
        textAnchor="middle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {strokePercent.toFixed(0)}%
      </motion.text>
    </svg>
  );
}
