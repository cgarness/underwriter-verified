import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

export interface AgentData {
  contactCardOnly?: boolean;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  agency: string;
  npn: string;
  bio: string;
  shortBio: string;
  headshotUrl: string;
  calendarUrl: string;
  stateLicenses: string[];
  testimonials: { quote: string; name: string }[];
}

const DEFAULT_DATA: AgentData = {
  name: "Christopher Garness",
  firstName: "Christopher",
  lastName: "Garness",
  phone: "(909) 775-6963",
  email: "chris@fflagent.com",
  agency: "CG Financial",
  npn: "",
  bio: "I'm Christopher Garness, an independent life insurance agent with CG Financial. I'm passionate about helping families and individuals find the right life insurance coverage to protect their loved ones. I believe that everyone deserves access to clear, honest guidance when it comes to financial protection — no jargon, no pressure, just straightforward advice tailored to your unique situation.",
  shortBio: "Independent life insurance agent helping families find the right coverage. Christopher Garness | CG Financial.",
  headshotUrl: "",
  calendarUrl: "#contact",
  stateLicenses: [
    "CA - #0M84521",
  ],
  testimonials: [
    { quote: "Christopher explained everything in plain English. For the first time, I actually understood my policy — and felt confident about it.", name: "Sarah M." },
    { quote: "We were overwhelmed after having our first child. Christopher walked us through our options without any pressure and found us the perfect plan.", name: "David & Leah R." },
    { quote: "I'd been putting off life insurance for years because it felt complicated. Christopher made the whole process simple and even enjoyable.", name: "James T." },
  ],
};

const STORAGE_KEY = "agent-data";

interface AgentDataContextType {
  data: AgentData;
  updateData: (data: AgentData) => void;
}

const AgentDataContext = createContext<AgentDataContextType>({
  data: DEFAULT_DATA,
  updateData: () => {},
});

export function AgentDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AgentData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old bio1/bio2/bio3 to single bio
        if (parsed.bio1 && !parsed.bio) {
          parsed.bio = [parsed.bio1, parsed.bio2, parsed.bio3].filter(Boolean).join(" ");
          delete parsed.bio1;
          delete parsed.bio2;
          delete parsed.bio3;
        }
        return { ...DEFAULT_DATA, ...parsed };
      }
    } catch { /* Ignore malformed legacy editor preferences. Public routes never use this cache. */ }
    return DEFAULT_DATA;
  });

  const updateData = useCallback((newData: AgentData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  const value = useMemo(
    () => ({
      data,
      updateData,
    }),
    [data, updateData]
  );

  return (
    <AgentDataContext.Provider value={value}>
      {children}
    </AgentDataContext.Provider>
  );
}

export const useAgentData = () => useContext(AgentDataContext);

/** Public routes receive the resolved agent synchronously, never another route's local cache. */
export function PublicAgentDataProvider({ data, children }: { data: AgentData; children: ReactNode }) {
  const value = useMemo(() => ({ data, updateData: () => {} }), [data]);
  return <AgentDataContext.Provider value={value}>{children}</AgentDataContext.Provider>;
}
