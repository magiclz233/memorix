import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-sm border border-zinc-200 bg-white p-4 justify-between flex flex-col space-y-4 dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-none",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {icon}
        <div className="font-sans font-bold text-zinc-900 dark:text-zinc-100 mb-2 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-zinc-500 text-xs dark:text-zinc-400">
          {description}
        </div>
      </div>
    </div>
  );
};
