import { Beaker, Check } from "lucide-react";
import { TECHS } from "../game/data";
import { useGame } from "../game/store";

interface Props {
  showToast: (msg: string) => void;
}

export function TechTree({ showToast }: Props) {
  const researchedTechs = useGame((s) => s.researchedTechs);
  const research = useGame((s) => s.research);

  return (
    <div className="flex flex-col gap-2 max-w-md mx-auto">
      {TECHS.map((tech) => {
        const done = researchedTechs.includes(tech.id);
        const prereqsMet = tech.requires.every((r) => researchedTechs.includes(r));
        const prereqNames = tech.requires
          .map((r) => TECHS.find((t) => t.id === r)?.name)
          .join(", ");
        return (
          <div
            key={tech.id}
            style={{
              backgroundColor: "#252320",
              borderColor: done ? "#6E8CA0" : "#3A362F",
              opacity: !done && !prereqsMet ? 0.55 : 1,
            }}
            className="border rounded-md p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium flex items-center gap-1.5 text-paper">
                {done && <Check size={14} color="#6E8CA0" />}
                {tech.name}
              </div>
              <div className="text-xs mt-0.5 text-[#8A8477]">{tech.desc}</div>
              {tech.requires.length > 0 && (
                <div className="text-[10px] mt-1 text-[#5A564C]">Requires: {prereqNames}</div>
              )}
            </div>
            {!done && (
              <button
                onClick={() => showToast(research(tech.id))}
                disabled={!prereqsMet}
                style={{
                  backgroundColor: prereqsMet ? "#6E8CA0" : "#3A362F",
                  color: prereqsMet ? "#1B1A17" : "#5A564C",
                }}
                className="rounded-md px-3 py-2 flex items-center gap-1 text-xs font-medium shrink-0"
              >
                <Beaker size={12} /> {tech.cost}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
