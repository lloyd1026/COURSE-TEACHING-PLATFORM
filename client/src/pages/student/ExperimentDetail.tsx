
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Clock, FileCode, CheckCircle, Send, GraduationCap, Play, Terminal, Save, Sparkles, AlertCircle } from "lucide-react";
import { CodeEditor } from "@/components/CodeEditor";
import ReactMarkdown from "react-markdown";

export default function StudentExperimentDetail() {
    const [, params] = useRoute("/student/experiments/:id");
    const experimentId = parseInt(params?.id || "0");

    const [code, setCode] = useState("// Write your code here...\n");
    const [language, setLanguage] = useState("javascript");
    const [output, setOutput] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // AI Check State
    const [checkResult, setCheckResult] = useState<{ score: number, feedback: string, suggestions: string } | null>(null);
    const [isCheckOpen, setIsCheckOpen] = useState(false);

    const { data: experiment, isLoading } = trpc.experiments.get.useQuery(
        { id: experimentId },
        { enabled: !!experimentId }
    );

    const { data: mySubmission, refetch: refetchSubmission } = trpc.experiments.getMySubmission.useQuery(
        { experimentId },
        { enabled: !!experimentId }
    );

    const { data: linkedKPs } = trpc.knowledge.getLinkedPoints.useQuery(
        { entityType: "experiment", entityId: experimentId },
        { enabled: !!experimentId }
    );

    const submitMutation = trpc.experiments.submit.useMutation({
        onSuccess: () => {
            toast.success("Submitted & Graded Successfully!");
            refetchSubmission();
        },
        onError: (error) => toast.error(error.message),
    });

    const saveDraftMutation = trpc.experiments.saveDraft.useMutation({
        onSuccess: () => {
            toast.success("Draft saved successfully");
            refetchSubmission();
        },
        onError: (err) => toast.error(err.message)
    });

    const checkMutation = trpc.experiments.check.useMutation({
        onSuccess: (data) => {
            setCheckResult(data);
            setIsCheckOpen(true);
            toast.success("AI Analysis Complete");
        },
        onError: (err) => toast.error(err.message)
    });

    const runMutation = trpc.experiments.run.useMutation({
        onSuccess: (data) => {
            setOutput(data.output);
            setIsError(data.error);
            if (data.error) {
                toast.error("Execution Error");
            } else {
                toast.success("Execution Complete");
            }
        },
        onError: (error) => {
            setOutput(error.message);
            setIsError(true);
            toast.error("Execution Failed");
        }
    });

    const handleSubmit = () => {
        if (!code.trim()) {
            toast.error("Please enter code");
            return;
        }
        submitMutation.mutate({ experimentId, code });
    };

    const handleSaveDraft = () => {
        if (!code.trim()) return;
        saveDraftMutation.mutate({ experimentId, code });
    };

    const handleCheck = () => {
        if (!code.trim()) {
            toast.error("Please enter code first");
            return;
        }
        checkMutation.mutate({ experimentId, code });
    };

    const handleRun = () => {
        if (!code.trim()) return;
        setOutput(null);
        runMutation.mutate({ code, language });
    };

    // Initialize code from submission
    useEffect(() => {
        if (mySubmission?.code && !isInitialized) {
            setCode(mySubmission.code);
            setIsInitialized(true);
        }
    }, [mySubmission, isInitialized]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!experiment) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Experiment not found</p>
                    <Link href="/student/experiments">
                        <Button variant="link">Back to List</Button>
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const isOverdue = new Date(experiment.dueDate) < new Date();

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/student/experiments">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{experiment.title}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Due: {new Date(experiment.dueDate).toLocaleString()}</span>
                            {isOverdue && <Badge variant="destructive">Closed</Badge>}
                        </div>
                    </div>
                    {mySubmission && (
                        <div className="flex items-center gap-2">
                            {/* Submission Status Badge */}
                            <Badge variant={['evaluated', 'graded'].includes(mySubmission.status) ? 'default' : 'secondary'}>
                                {mySubmission.status === 'draft' ? '草稿' :
                                    mySubmission.status === 'submitted' ? '已提交' :
                                        ['evaluated', 'graded'].includes(mySubmission.status) ? '已评分' : mySubmission.status}
                            </Badge>
                            {/* AI Score */}
                            {(mySubmission.evaluationResult as any)?.aiScore !== undefined && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    AI: {(mySubmission.evaluationResult as any).aiScore}
                                </Badge>
                            )}
                            {/* Teacher Score */}
                            {(mySubmission.evaluationResult as any)?.manualScore !== undefined && (
                                <Badge variant="default" className="bg-green-600">
                                    综合: {(mySubmission.evaluationResult as any).manualScore}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                <Tabs defaultValue="submit">
                    <TabsList>
                        <TabsTrigger value="submit">Coding IDE</TabsTrigger>
                        <TabsTrigger value="details">Requirements</TabsTrigger>
                        <TabsTrigger value="knowledge">Knowledge Points</TabsTrigger>
                        {mySubmission?.status === 'evaluated' && (
                            <TabsTrigger value="result">AI Report</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="submit" className="mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
                            {/* Editor Column */}
                            <div className="lg:col-span-2 flex flex-col gap-4">
                                <Card className="flex-1 flex flex-col border-0 shadow-none bg-transparent">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileCode className="h-5 w-5" />
                                            <span className="font-semibold">Code Editor</span>
                                            <Select value={language} onValueChange={setLanguage}>
                                                <SelectTrigger className="w-[120px] h-8">
                                                    <SelectValue placeholder="Language" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                                    <SelectItem value="python">Python</SelectItem>
                                                    <SelectItem value="cpp">C++</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {/* Auto-save indicator or last saved time */}
                                            {mySubmission?.lastActionAt && (
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    Last saved: {new Date(mySubmission.lastActionAt).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCheck}
                                                disabled={checkMutation.isPending || isOverdue}
                                                className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
                                            >
                                                {checkMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                )}
                                                AI Check
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSaveDraft}
                                                disabled={saveDraftMutation.isPending || isOverdue}
                                            >
                                                {saveDraftMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Save className="h-4 w-4 mr-2" />
                                                )}
                                                Save Draft
                                            </Button>

                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleRun}
                                                disabled={runMutation.isPending}
                                            >
                                                {runMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Play className="h-4 w-4 mr-2 fill-current" />
                                                )}
                                                Run Code
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSubmit}
                                                disabled={submitMutation.isPending || isOverdue}
                                            >
                                                {submitMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Send className="h-4 w-4 mr-2" />
                                                )}
                                                {submitMutation.isPending ? 'Grading...' : 'Submit'}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-h-0 border rounded-md overflow-hidden ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 shadow-sm">
                                        <CodeEditor
                                            value={code}
                                            onChange={(val) => setCode(val || "")}
                                            language={language}
                                            height="100%"
                                        />
                                    </div>
                                </Card>
                            </div>

                            {/* Output / Console & AI Report Column */}
                            <div className="flex flex-col gap-4">
                                <Tabs defaultValue="console" className="flex-1 flex flex-col min-h-0">
                                    <TabsList className="w-full justify-start px-0 bg-transparent border-b rounded-none mb-0">
                                        <TabsTrigger
                                            value="console"
                                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary"
                                        >
                                            <Terminal className="h-4 w-4 mr-2" />
                                            Console
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="report"
                                            disabled={mySubmission?.status !== 'evaluated'}
                                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            AI Report {mySubmission?.score !== undefined && `(${mySubmission.score})`}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="console" className="flex-1 mt-0 relative min-h-0">
                                        <Card className="h-full flex flex-col border-t-0 rounded-t-none shadow-sm">
                                            <CardContent className="flex-1 p-0 relative bg-black/90 text-white rounded-b-lg overflow-hidden">
                                                {runMutation.isPending ? (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                        <span className="ml-2 text-muted-foreground text-sm">Executing...</span>
                                                    </div>
                                                ) : output ? (
                                                    <pre className={`p-4 font-mono text-xs md:text-sm whitespace-pre-wrap h-full overflow-auto ${isError ? 'text-red-400' : 'text-green-400'}`}>
                                                        {output}
                                                    </pre>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm gap-2">
                                                        <Terminal className="h-8 w-8 opacity-20" />
                                                        <p>Click "Run Code" to execute.</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="report" className="flex-1 mt-0 min-h-0">
                                        <Card className="h-full flex flex-col border-t-0 rounded-t-none shadow-sm bg-muted/20">
                                            <CardContent className="flex-1 p-4 overflow-auto">
                                                {mySubmission?.status === 'evaluated' ? (
                                                    <div className="space-y-4">
                                                        {/* Score Badges - Show Both */}
                                                        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-3 rounded-lg border">
                                                            {/* AI Score */}
                                                            <div className="flex-1 text-center border-r pr-4">
                                                                <div className="text-xs text-muted-foreground mb-1">AI 评分</div>
                                                                <div className={`text-2xl font-bold ${Number((mySubmission.evaluationResult as any)?.aiScore || mySubmission.score || 0) >= 90 ? 'text-blue-600' :
                                                                    Number((mySubmission.evaluationResult as any)?.aiScore || mySubmission.score || 0) >= 60 ? 'text-blue-500' : 'text-blue-400'
                                                                    }`}>
                                                                    {(mySubmission.evaluationResult as any)?.aiScore ?? mySubmission.score ?? '-'}
                                                                </div>
                                                            </div>
                                                            {/* Teacher Score */}
                                                            <div className="flex-1 text-center">
                                                                <div className="text-xs text-muted-foreground mb-1">综合评分</div>
                                                                <div className={`text-2xl font-bold ${(mySubmission.evaluationResult as any)?.manualScore === undefined ? 'text-gray-400' :
                                                                    Number((mySubmission.evaluationResult as any)?.manualScore || 0) >= 90 ? 'text-green-600' :
                                                                        Number((mySubmission.evaluationResult as any)?.manualScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                                    }`}>
                                                                    {(mySubmission.evaluationResult as any)?.manualScore ?? '待评'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Feedback */}
                                                        <div className="space-y-2">
                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                                                                <Terminal className="h-3 w-3" /> Feedback
                                                            </h4>
                                                            <div className="markdown-body text-sm p-3 bg-white dark:bg-zinc-900 rounded-lg border">
                                                                <ReactMarkdown>
                                                                    {mySubmission.feedback || "No feedback."}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>

                                                        {/* Suggestions */}
                                                        <div className="space-y-2">
                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                                                                <GraduationCap className="h-3 w-3" /> Suggestions
                                                            </h4>
                                                            <div className="markdown-body text-sm p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                                                                <ReactMarkdown>
                                                                    {(mySubmission.evaluationResult as any)?.suggestions || "No suggestions."}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                        <p>No report available yet.</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>

                                <div className="p-2 text-xs text-muted-foreground bg-muted/20 border rounded-md">
                                    {mySubmission && mySubmission.submittedAt ? (
                                        <span>Submitted: {new Date(mySubmission.submittedAt).toLocaleString()}</span>
                                    ) : (
                                        <span>Not submitted yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="details" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Experiment Requirements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose max-w-none">
                                    <p>{experiment.description || "No description"}</p>
                                    {experiment.requirements && (
                                        <>
                                            <h4>Requirements</h4>
                                            <p className="whitespace-pre-wrap">{experiment.requirements}</p>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="knowledge" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5" />
                                    Knowledge Points
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!linkedKPs || linkedKPs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No linked knowledge points
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {linkedKPs.map((kp: any) => (
                                            <div key={kp.id} className="p-3 bg-muted rounded-lg">
                                                <p className="font-medium">{kp.name}</p>
                                                {kp.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">{kp.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {mySubmission?.status === 'evaluated' && (
                        <TabsContent value="result" className="mt-4">
                            <Card className="border-2 border-primary/10">
                                <CardHeader className="bg-primary/5 border-b pb-6">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-xl">
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                            AI Evaluation Report
                                        </CardTitle>
                                        <Badge variant="outline" className="text-sm px-3 py-1 bg-background">
                                            AI Powered
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        Automated analysis by Course Platform AI
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    {/* Dual Score Display */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* AI Score */}
                                        <div className="flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                            <span className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold mb-2">AI 评分</span>
                                            <div className="text-5xl font-black text-blue-600">
                                                {(mySubmission.evaluationResult as any)?.aiScore ?? mySubmission.score ?? '-'}
                                            </div>
                                        </div>
                                        {/* Teacher Score */}
                                        <div className={`flex flex-col items-center justify-center p-6 rounded-xl border ${(mySubmission.evaluationResult as any)?.manualScore !== undefined
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                : 'bg-muted/30 border-dashed'
                                            }`}>
                                            <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-2">综合评分 (教师)</span>
                                            <div className={`text-5xl font-black ${(mySubmission.evaluationResult as any)?.manualScore === undefined ? 'text-gray-400' :
                                                    Number((mySubmission.evaluationResult as any)?.manualScore || 0) >= 90 ? 'text-green-600' :
                                                        Number((mySubmission.evaluationResult as any)?.manualScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                {(mySubmission.evaluationResult as any)?.manualScore ?? '待评'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Terminal className="h-4 w-4" />
                                                Detailed Feedback
                                            </h3>
                                            <div className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed border min-h-[200px] markdown-body">
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown>
                                                        {mySubmission.feedback || "No feedback available."}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                Suggestions
                                            </h3>
                                            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg text-sm leading-relaxed border border-blue-100 dark:border-blue-900 min-h-[200px] markdown-body">
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown>
                                                        {(mySubmission.evaluationResult as any)?.suggestions || "No specific suggestions."}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>

                {/* AI Check Result Dialog */}
                <Dialog open={isCheckOpen} onOpenChange={setIsCheckOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-blue-500" />
                                AI Preliminary Check
                            </DialogTitle>
                            <DialogDescription>
                                Automated analysis of your current code. This does not affect your final submission.
                            </DialogDescription>
                        </DialogHeader>

                        {checkResult && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-center p-4 bg-muted/20 rounded-lg border">
                                    <div className="text-center">
                                        <div className="text-sm text-muted-foreground uppercase font-medium">Estimated Score</div>
                                        <div className={`text-4xl font-bold ${checkResult.score >= 90 ? 'text-green-600' :
                                            checkResult.score >= 60 ? 'text-yellow-600' : 'text-red-500'
                                            }`}>
                                            ~{checkResult.score}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                            <AlertCircle className="h-4 w-4 text-orange-500" />
                                            Analysis & Hints
                                        </h4>
                                        <div className="text-sm bg-muted/10 p-4 rounded-md border markdown-body">
                                            <ReactMarkdown>{checkResult.feedback}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {checkResult.suggestions && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                                <GraduationCap className="h-4 w-4 text-blue-500" />
                                                Improvement Suggestions
                                            </h4>
                                            <div className="text-sm bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-md border border-blue-100 dark:border-blue-900 markdown-body">
                                                <ReactMarkdown>{checkResult.suggestions}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setIsCheckOpen(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
