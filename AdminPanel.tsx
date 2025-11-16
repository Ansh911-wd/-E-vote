import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Users, BarChart3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Candidate {
  id: string;
  name: string;
  party: string;
  description: string | null;
  photo_url: string | null;
}

interface VoteCount {
  candidate_id: string;
  candidate_name: string;
  candidate_party: string;
  vote_count: number;
}

interface Voter {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  has_voted: boolean;
}

const AdminPanel = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voteResults, setVoteResults] = useState<VoteCount[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    party: "",
    description: "",
    photo_url: "",
  });

  useEffect(() => {
    fetchCandidates();
    fetchVoteResults();
    fetchVoters();
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

  const fetchVoteResults = async () => {
    try {
      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("candidate_id");

      if (votesError) throw votesError;

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, name, party");

      if (candidatesError) throw candidatesError;

      const voteCounts = candidatesData.map((candidate) => ({
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        candidate_party: candidate.party,
        vote_count: votesData.filter((vote) => vote.candidate_id === candidate.id).length,
      }));

      voteCounts.sort((a, b) => b.vote_count - a.vote_count);
      setVoteResults(voteCounts);
    } catch (error) {
      console.error("Error fetching vote results:", error);
      toast.error("Failed to load vote results");
    }
  };

  const fetchVoters = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("voter_id");

      if (votesError) throw votesError;

      const votersWithStatus = profilesData.map((profile) => ({
        ...profile,
        has_voted: votesData.some((vote) => vote.voter_id === profile.id),
      }));

      setVoters(votersWithStatus);
    } catch (error) {
      console.error("Error fetching voters:", error);
      toast.error("Failed to load voters");
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("candidates").insert({
        name: newCandidate.name,
        party: newCandidate.party,
        description: newCandidate.description || null,
        photo_url: newCandidate.photo_url || null,
      });

      if (error) throw error;

      toast.success("Candidate added successfully");
      setNewCandidate({ name: "", party: "", description: "", photo_url: "" });
      fetchCandidates();
      fetchVoteResults();
    } catch (error: any) {
      console.error("Error adding candidate:", error);
      toast.error("Failed to add candidate");
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    try {
      const { error } = await supabase.from("candidates").delete().eq("id", id);

      if (error) throw error;

      toast.success("Candidate deleted successfully");
      fetchCandidates();
      fetchVoteResults();
    } catch (error: any) {
      console.error("Error deleting candidate:", error);
      toast.error("Failed to delete candidate");
    }
  };

  const totalVotes = voteResults.reduce((sum, result) => sum + result.vote_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
        <p className="text-muted-foreground">Manage candidates and view results</p>
      </div>

      <Tabs defaultValue="results" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="results">
            <BarChart3 className="w-4 h-4 mr-2" />
            Results
          </TabsTrigger>
          <TabsTrigger value="voters">
            <Users className="w-4 h-4 mr-2" />
            Voters
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Users className="w-4 h-4 mr-2" />
            Candidates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Voting Results</CardTitle>
              <CardDescription>Real-time vote counts for all candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {voteResults.map((result, index) => {
                  const percentage = totalVotes > 0 ? (result.vote_count / totalVotes) * 100 : 0;
                  
                  return (
                    <div key={result.candidate_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{result.candidate_name}</p>
                            <p className="text-sm text-muted-foreground">{result.candidate_party}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{result.vote_count}</p>
                          <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-gradient-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                
                {totalVotes === 0 && (
                  <p className="text-center text-muted-foreground py-8">No votes cast yet</p>
                )}
                
                {totalVotes > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-center font-semibold">Total Votes: {totalVotes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Voters</CardTitle>
              <CardDescription>
                Total: {voters.length} | Voted: {voters.filter(v => v.has_voted).length} | Pending: {voters.filter(v => !v.has_voted).length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {voters.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No voters registered yet</p>
                ) : (
                  voters.map((voter) => (
                    <div
                      key={voter.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{voter.full_name || "No name provided"}</p>
                        <p className="text-sm text-muted-foreground">{voter.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Registered: {new Date(voter.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {voter.has_voted ? (
                          <div className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                            ✓ Voted
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                            Pending
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Candidate</CardTitle>
              <CardDescription>Add a new candidate to the ballot</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCandidate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Candidate Name *</Label>
                    <Input
                      id="name"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      required
                      placeholder="John Smith"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="party">Party *</Label>
                    <Input
                      id="party"
                      value={newCandidate.party}
                      onChange={(e) => setNewCandidate({ ...newCandidate, party: e.target.value })}
                      required
                      placeholder="Democratic Party"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCandidate.description}
                    onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                    placeholder="Brief description of the candidate..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="photo_url">Photo URL</Label>
                  <Input
                    id="photo_url"
                    value={newCandidate.photo_url}
                    onChange={(e) => setNewCandidate({ ...newCandidate, photo_url: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Existing Candidates</CardTitle>
              <CardDescription>View and remove candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div>
                      <p className="font-semibold">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground">{candidate.party}</p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {candidate.name}? This will also delete all votes for this candidate.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCandidate(candidate.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                
                {candidates.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No candidates yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
