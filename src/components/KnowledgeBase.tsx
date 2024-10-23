"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Plus, Upload, Save, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore"
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyApS6_LdhAqKTl8Z0JLWqa2fGZUw10nD4Y',
  authDomain: 'yalp-77a29.firebaseapp.com',
  projectId: 'yalp-77a29',
  storageBucket: 'yalp-77a29.appspot.com',
  messagingSenderId: '13179626113',
  appId: '1:13179626113:web:a60b5d4f5fd678d1502380',
  measurementId: 'G-NHQCPB41Y9',}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)
const storage = getStorage(app)

const categories = ["Guides", "Support", "Tutorials", "FAQs"]

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  fileUrl?: string;
  createdAt: Date;
  createdBy: string;
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [newArticle, setNewArticle] = useState<{ title: string; content: string; category: string; file: File | null }>({ title: "", content: "", category: "", file: null })
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const { toast } = useToast()

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const querySnapshot = await getDocs(collection(db, "articles"))
      const fetchedArticles = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          category: data.category,
          fileUrl: data.fileUrl,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
        } as Article;
      });
      setArticles(fetchedArticles)
    } catch (error) {
      console.error("Failed to fetch articles:", error)
      toast({
        title: "Error",
        description: "Failed to fetch articles. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      if (user) {
        fetchArticles()
      } else {
        setArticles([])
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [fetchArticles])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = () => {
    setIsAddingNew(true)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      let fileUrl = ""
      if (newArticle.file) {
        const storageRef = ref(storage, `files/${newArticle.file.name}`)
        await uploadBytes(storageRef, newArticle.file)
        fileUrl = await getDownloadURL(storageRef)
      }

      await addDoc(collection(db, "articles"), {
        ...newArticle,
        fileUrl,
        createdAt: new Date(),
        createdBy: user?.uid,
      })

      toast({
        title: "Success",
        description: "Article saved successfully!",
      })

      setNewArticle({ title: "", content: "", category: "", file: null })
      setIsAddingNew(false)
      fetchArticles()
    } catch (error) {
      console.error("Failed to save article:", error)
      toast({
        title: "Error",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewArticle({ ...newArticle, file: e.target.files[0] })
    }
  }

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Failed to sign in:", error)
      toast({
        title: "Error",
        description: "Failed to sign in. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Failed to sign out:", error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (articleId: string) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      setLoading(true)
      try {
        await deleteDoc(doc(db, "articles", articleId))
        toast({
          title: "Success",
          description: "Article deleted successfully!",
        })
        fetchArticles()
      } catch (error) {
        console.error("Failed to delete article:", error)
        toast({
          title: "Error",
          description: "Failed to delete article. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        {user ? (
          <Button onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        ) : (
          <Button onClick={handleSignIn}>Sign In</Button>
        )}
      </div>
      {user && (
        <>
          <div className="flex space-x-2 mb-4">
            <Input
              type="text"
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={handleSearch}
              className="flex-grow"
            />
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" /> Add New
            </Button>
          </div>
          {isAddingNew && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Add New Article</CardTitle>
                <CardDescription>Fill in the details for the new knowledge base article</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="text"
                  placeholder="Title"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                />
                <Textarea
                  placeholder="Content"
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                />
                <Select onValueChange={(value) => setNewArticle({ ...newArticle, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Input type="file" onChange={handleFileChange} />
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" /> Attach File
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save Article
                </Button>
              </CardFooter>
            </Card>
          )}
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Card key={article.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{article.title}</CardTitle>
                      <CardDescription>{article.category}</CardDescription>
                    </div>
                    <Button variant="destructive" onClick={() => handleDelete(article.id)}>
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{article.content}</p>
                  {article.fileUrl && (
                    <a href={article.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      Attached File
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      {!user && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to the Knowledge Base</CardTitle>
            <CardDescription>Please sign in to access the knowledge base.</CardDescription>
          </CardHeader>
        </Card>
      )}
      <Toaster />
    </div>
  )
}
