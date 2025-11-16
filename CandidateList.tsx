import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Vote } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  party: string;
  description: string | null;
  photo_url: string | null;
}

interface CandidateListProps {
  userId: string;
  hasVoted: boolean;
  onVoteSuccess: () => void;
}

const CandidateList = ({ userId, hasVoted, onVoteSuccess }: CandidateListProps) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .order("name");

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (candidateId: string) => {
    if (hasVoted) {
      toast.error("You have already voted!");
      return;
    }

    setVotingFor(candidateId);

    try {
      const { error } = await supabase
        .from("votes")
        .insert({
          voter_id: userId,
          candidate_id: candidateId,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already cast your vote!");
        } else {
          throw error;
        }
      } else {
        toast.success("Vote cast successfully!");
        onVoteSuccess();
      }
    } catch (error: any) {
      console.error("Error casting vote:", error);
      toast.error("Failed to cast vote");
    } finally {
      setVotingFor(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No candidates available at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Available Candidates</h2>
          <p className="text-muted-foreground">Choose your preferred candidate</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {candidates.length} Candidates
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {candidates.map((candidate) => (
          <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{candidate.name}</CardTitle>
              <Badge className="mx-auto mt-2 bg-primary/10 text-primary hover:bg-primary/20">
                {candidate.party}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.description && (
                <p className="text-sm text-muted-foreground text-center">
                  {candidate.description}
                </p>
              )}
              
              <Button
                className="w-full"
                onClick={() => handleVote(candidate.id)}
                disabled={hasVoted || votingFor !== null}
              >
                {hasVoted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Voted
                  </>
                ) : votingFor === candidate.id ? (
                  "Casting Vote..."
                ) : (
                  <>
                    <Vote className="w-4 h-4 mr-2" />
                    Vote
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CandidateList;
