import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Search as SearchIcon, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";

interface AgentResult {
  name: string;
  agency: string;
  slug: string;
  agency_slug: string;
  npn: string;
  state_licenses: unknown;
}

export default function Search() {
  usePageTitle("Find an Agent | Underwriter Verified");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgentResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);

    const pattern = `%${q}%`;
    const { data, error } = await supabase
      .from("agents")
      .select("name, agency, slug, agency_slug, npn, state_licenses")
      .eq("is_published", true)
      .or(
        `name.ilike.${pattern},agency.ilike.${pattern},slug.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},npn.ilike.${pattern}`
      );

    if (!error && data) {
      setResults(data);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20">
              <Shield className="h-7 w-7 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Find Your Agent
          </h1>
          <p className="mt-3 text-muted-foreground">
            Search by agent name, agency, phone number, email, or NPN.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex gap-3">
            <Input
              placeholder="Name, agency, phone, email, or NPN…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              <SearchIcon className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
        </div>

        <div className="mx-auto mt-12 max-w-2xl space-y-4">
          {loading && (
            <p className="text-center text-muted-foreground">Searching…</p>
          )}

          {searched && !loading && results.length === 0 && (
            <p className="text-center text-muted-foreground">
              No agents found. Try a different search term.
            </p>
          )}

          {results.map((agent) => (
            <Card key={agent.slug} className="border-border/50">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <h3 className="font-semibold text-foreground">{agent.name}</h3>
                  {agent.agency && (
                    <p className="text-sm text-muted-foreground">{agent.agency}</p>
                  )}
                  {agent.npn && (
                    <p className="text-xs text-muted-foreground">NPN: {agent.npn}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/${agent.agency_slug}/${agent.slug}`}>
                    View Profile <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-medium text-foreground">Underwriter Verified</p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
            This directory does not send text messages. Each agent profile page, including any SMS
            program, is operated by the named licensed agent and agency.
          </p>
        </div>
      </footer>
    </div>
  );
}
