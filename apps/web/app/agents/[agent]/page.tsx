"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Script from "next/script"
import {
  Calculator,
  Atom,
  Brain,
  Send,
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AgentChat() {
  // We now use `useParams()` to read the [agent] route param
  const { agent } = useParams()
  const agentType = agent || "math" // fallback to "math" if no param is present
  console.log("Agent type:", agentType)

  // NextAuth session
  const { data: session, status } = useSession()

  // Local chat states
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [lastQuestion, setLastQuestion] = useState("")

  // Dialog + posting states
  const [showPostDialog, setShowPostDialog] = useState(false)
  const [reward, setReward] = useState(0.1)
  const [isPostingQuestion, setIsPostingQuestion] = useState(false)
  const [postStatus, setPostStatus] = useState({ show: false, success: false, message: "" })

  // Toast from our UI
  const { toast } = useToast()

  // For auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Agent metadata
  const agentInfo = {
    math: {
      name: "Mathematics Agent",
      icon: <Calculator className="h-6 w-6" />,
      subject: "MATH",
    },
    physics: {
      name: "Physics Agent",
      icon: <Atom className="h-6 w-6" />,
      subject: "PHYSICS",
    },
    chemistry: {
      name: "Chemistry Agent",
      icon: <Brain className="h-6 w-6" />,
      subject: "COMPUTER_SCIENCE",
    },
  }
  const currentAgent = agentInfo[agentType] || agentInfo.math

  // Send a user message & get simulated AI reply
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Save user message
    const userMessage = { role: "user", content: inputValue }
    setMessages((prev) => [...prev, userMessage])
    setLastQuestion(inputValue)
    setInputValue("")
    setIsLoading(true)

    // Simulated AI response after 2s
    setTimeout(() => {
      const assistantMessage = {
        role: "assistant",
        content: generateResponse(agentType, userMessage.content),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 2000)
  }

  // Attempt to post question
  const handlePostQuestion = async () => {
    if (isPostingQuestion) return // no double submit
    console.log("Attempting to post question to community...")

    const walletAddress = session?.user?.walletAddress
    if (!walletAddress) {
      toast({
        title: "Authentication Required",
        description: "Please sign in with your wallet to post questions",
        variant: "destructive",
      })
      setShowPostDialog(false)
      return
    }

    setIsPostingQuestion(true)
    setPostStatus({
      show: true,
      success: false,
      message: "Posting your question to the community...",
    })

    try {
      const postData = {
        walletAddress,
        content: lastQuestion,
        subject: currentAgent.subject,
        reward,
      }
      console.log("postData:", postData)

      await new Promise((res) => setTimeout(res, 100)) // small UI delay
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
        }
        throw new Error(errorData.error || errorData.message || "Failed to post question")
      }

      const data = await response.json()
      console.log("Response from server:", data)

      setPostStatus({
        show: true,
        success: true,
        message: `Question posted successfully! IPFS CID: ${data.pinataCid?.substring(0, 8) || "N/A"}...`,
      })

      toast({
        title: "Question Posted Successfully",
        description: data.pinataCid
          ? `Posted with IPFS CID: ${data.pinataCid.substring(0, 8)}...`
          : "Your question is now on the community feed.",
      })

      // Redirect to dashboard after short delay
      setTimeout(() => {
        const redirectUrl = `/dashboard?questionId=${data.questionId || ""}`
        window.location.href = redirectUrl
      }, 2000)
    } catch (error: any) {
      console.error("Error posting question:", error)
      setPostStatus({
        show: true,
        success: false,
        message: `Error: ${error.message}`,
      })
      toast({
        title: "Error Posting Question",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      if (!postStatus.success) {
        setIsPostingQuestion(false)
      }
    }
  }

  // Close the post status alert
  const handleClosePostStatus = () => {
    setPostStatus({ show: false, success: false, message: "" })
    // If it was an error, also close the main dialog
    if (!postStatus.success) {
      setShowPostDialog(false)
      setIsPostingQuestion(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-500 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-green-500/30 p-4">
        <div className="container mx-auto flex items-center">
          <Link href="/dashboard" className="mr-4">
            <Button variant="ghost" size="icon" className="text-green-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            {currentAgent.icon}
            <h1 className="text-xl font-bold">{currentAgent.name}</h1>
          </div>

          {/* Session Info */}
          <div className="ml-auto text-xs text-green-400/50">
            Wallet: {session?.user?.walletAddress ? `${session.user.walletAddress.substring(0, 6)}...` : "Not connected"}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 container mx-auto p-4 flex flex-col">
        {/* If we have a posting status alert, show it */}
        {postStatus.show && (
          <Alert className={`mb-4 ${postStatus.success ? "bg-green-900/30 border-green-500" : "bg-red-900/30 border-red-500"}`}>
            <div className="flex justify-between items-start">
              <div>
                <AlertTitle className={postStatus.success ? "text-green-400" : "text-red-400"}>
                  {postStatus.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription className="text-green-100">{postStatus.message}</AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-green-500 h-8 w-8"
                onClick={handleClosePostStatus}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        )}

        {/* Chat Card */}
        <Card className="flex-1 border-green-500 bg-black overflow-hidden flex flex-col">
          <CardHeader className="border-b border-green-500/30">
            <CardTitle className="text-lg">Chat with {currentAgent.name}</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            <Script
              id="mathjax-script"
              strategy="afterInteractive"
              src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
            />
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-green-400/70">
                <p>Ask a question to get started...</p>
              </div>
            ) : (
              messages.map((message, index) => {
                // If it's an assistant response, we show a "Not satisfied? Post question" button under it
                if (message.role === "assistant") {
                  return (
                    <div key={index} className="flex justify-start">
                      <div className="max-w-[80%] p-3 rounded-lg bg-gray-900 text-green-400 border border-green-500/50">
                        <div
                          className="latex-content"
                          dangerouslySetInnerHTML={{
                            __html: message.content.replace(/\$\$(.*?)\$\$/g, (_, latex) => `\$$${latex}\$$`),
                          }}
                        />
                        {/* Button to open the post dialog */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 border-green-500 text-green-500"
                          onClick={() => setShowPostDialog(true)}
                        >
                          Not satisfied? Post question
                        </Button>
                      </div>
                    </div>
                  )
                } else {
                  // It's a user message
                  return (
                    <div key={index} className="flex justify-end">
                      <div className="max-w-[80%] p-3 rounded-lg bg-green-900/30 text-green-100">
                        <p>{message.content}</p>
                      </div>
                    </div>
                  )
                }
              })
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-gray-900 text-green-400 border border-green-500/50">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p>Thinking...</p>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className="border-t border-green-500/30 p-4">
            <form onSubmit={handleSendMessage} className="w-full flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Ask the ${currentAgent.name} a question...`}
                className="flex-1 bg-black border-green-500 text-green-100"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-green-700 hover:bg-green-600 text-white border border-green-500"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </main>

      {/* Dialog for posting question */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="bg-black border-green-500 text-green-500">
          <DialogHeader>
            <DialogTitle>Was this answer satisfactory?</DialogTitle>
            <DialogDescription className="text-green-400">
              If not, you can post this question to the community with a reward.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border border-green-500/50 p-3 rounded-lg">
              <Badge variant="outline" className="mb-2 border-green-500 text-green-400">
                Your Question
              </Badge>
              <p>{lastQuestion}</p>
            </div>

            <div className="flex items-center gap-2 text-green-400">
              <Badge variant="outline" className="border-green-500 text-green-400">
                Subject
              </Badge>
              <p>{currentAgent.subject}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-green-400">Reward Amount (ASK tokens)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={reward}
                  onChange={(e) => setReward(Number.parseFloat(e.target.value))}
                  className="bg-black border-green-500 text-green-100"
                />
                <Badge className="bg-green-700 text-white">ASK</Badge>
              </div>
            </div>

            {status !== "authenticated" && (
              <div className="flex items-center gap-2 text-yellow-500 p-2 border border-yellow-500/30 rounded-lg bg-yellow-900/20">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Please sign in with your wallet to post a question</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between">
            <Button
              variant="outline"
              className="border-green-500 text-green-500"
              onClick={() => setShowPostDialog(false)}
            >
              It's Satisfactory
            </Button>

            <Button
              className="bg-green-700 hover:bg-green-600 text-white border border-green-500"
              onClick={handlePostQuestion}
              disabled={isPostingQuestion || status !== "authenticated"}
            >
              {isPostingQuestion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Question"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function to generate mock responses
function generateResponse(agent: string, question: string) {
  console.log(`Generating response for ${agent} agent with question:`, question)

  const responses = {
    math: [
      "To solve this equation, you need to apply the chain rule of differentiation. For a function $$f(g(x))$$, the derivative is $$f'(g(x)) \\cdot g'(x)$$.",
      "This is a quadratic equation. You can solve it using the quadratic formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$.",
      "For this integral, try using substitution with $$u = \\sin(x)$$. Then $$du = \\cos(x)dx$$.",
    ],
    physics: [
      "According to Newton's Second Law, $$F = ma$$, where F is force, m is mass, and a is acceleration.",
      "The uncertainty principle states that $$\\Delta x \\cdot \\Delta p \\geq \\frac{\\hbar}{2}$$, where you cannot simultaneously know the exact position and momentum of a particle.",
      "In thermodynamics, entropy is given by the formula $$S = k_B \\ln W$$, where $$k_B$$ is Boltzmann's constant and W is the number of microstates.",
    ],
    chemistry: [
      "The pH scale measures how acidic or basic a solution is, ranging from 0 to 14. It's defined as $$pH = -\\log[H^+]$$.",
      "In organic chemistry, functional groups determine the chemical properties of molecules. For example, the carbonyl group is represented as $$C=O$$.",
      "A redox reaction involves the transfer of electrons between chemical species. The reduction potential is related to Gibbs free energy by $$\\Delta G = -nFE$$.",
    ],
  }

  const agentResponses = responses[agent] || responses.math
  const response = agentResponses[Math.floor(Math.random() * agentResponses.length)]
  console.log("Generated response:", response)
  return response
}
