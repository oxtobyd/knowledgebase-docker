"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Plus, Trash2, Paperclip, Lock, Upload, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc } from "firebase/firestore"
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth"
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'
import { ArticleModal } from './ArticleModal'
import { Navbar } from './Navbar'
import { saveAs } from 'file-saver'
import Papa from 'papaparse'


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

const categories = ["Portal", "MDS", "Candidates Panel", "Safeguarding", "DBS", "Stage 1", "Stage 2", "Training", "Other"]

export interface ArticleFile {
  name: string;
  url: string;
  extractedText?: string;
  thumbnailUrl?: string;
}

export interface Amendment {
  timestamp: Date;
  userId: string;
  userEmail: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  files: ArticleFile[];
  createdAt: Date;
  createdBy: string;
  extractedText?: string;
  tags: string[];
  newFiles?: File[];
  isPrivate: boolean;
  ownerId: string;
  amendments: Amendment[];
  lastModified?: Date;
  lastModifiedBy?: string;
}

export interface Tag {
  id: string;
  text: string;
}

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await import('pdfjs-dist');
    const pdfjsLib = pdf.default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const doc = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let extractedText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      extractedText += content.items.map((item) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      }).join(' ') + '\n';
    }
    return extractedText;
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import('mammoth/mammoth.browser');
    const result = await mammoth.extractRawText({arrayBuffer});
    return result.value;
  } else {
    throw new Error('Unsupported file type');
  }
}

const generateThumbnail = async (file: File): Promise<string> => {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file);
  }

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const iconSvg = getFileIcon(fileExtension);

  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 100, 100);

    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}`;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    ctx.drawImage(img, 25, 25, 50, 50);

    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(fileExtension.toUpperCase(), 50, 90);
  }

  return canvas.toDataURL();
};

const getFileIcon = (extension: string): string => {
  const icons: Record<string, string> = {
    pdf: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 62.9-21.9-12.7-9.6-24.9-23.4-34.5-40.8zM86.1 428.1c0 .8 13.2-5.4 34.9-40.2-6.7 6.3-29.1 24.5-34.9 40.2zM248 160h136v328c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V24C0 10.7 10.7 0 24 0h200v136c0 13.2 10.8 24 24 24zm-8 171.8c-20-12.2-33.3-29-42.7-53.8 4.5-18.5 11.6-46.6 6.2-64.2-4.7-29.4-42.4-26.5-47.8-6.8-5 18.3-.4 44.1 8.1 77-11.6 27.6-28.7 64.6-40.8 85.8-.1 0-.1.1-.2.1-27.1 13.9-73.6 44.5-54.5 68 5.6 6.9 16 10 21.5 10 17.9 0 35.7-18 61.1-61.8 25.8-8.5 54.1-19.1 79-23.2 21.7 11.8 47.1 19.5 64 19.5 29.2 0 31.2-32 19.7-43.4-13.9-13.6-54.3-9.7-73.6-7.2zM377 105L279 7c-4.5-4.5-10.6-7-17-7h-6v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zm-74.1 255.3c4.1-2.7-2.5-11.9-42.8-9 37.1 15.8 42.8 9 42.8 9z"/></svg>',
    doc: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm57.1 120H305c7.7 0 13.4 7.1 11.7 14.7l-38 168c-1.2 5.5-6.1 9.3-11.7 9.3h-38c-5.5 0-10.3-3.8-11.6-9.1-25.8-103.5-20.8-81.2-25.6-110.5h-.5c-1.1 14.3-2.4 17.4-25.6 110.5-1.3 5.3-6.1 9.1-11.6 9.1H117c-5.6 0-10.5-3.9-11.7-9.4l-37.8-168c-1.7-7.5 4-14.6 11.7-14.6h24.5c5.7 0 10.7 4 11.8 9.7 15.6 78 20.1 109.5 21 122.2 1.6-10.2 7.3-32.7 29.4-122.7 1.3-5.4 6.1-9.1 11.7-9.1h29.1c5.6 0 10.4 3.8 11.7 9.2 24 100.4 28.8 124 29.6 129.4-.2-11.2-2.6-17.8 21.6-129.2 1-5.6 5.9-9.5 11.5-9.5zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/></svg>',
    docx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm57.1 120H305c7.7 0 13.4 7.1 11.7 14.7l-38 168c-1.2 5.5-6.1 9.3-11.7 9.3h-38c-5.5 0-10.3-3.8-11.6-9.1-25.8-103.5-20.8-81.2-25.6-110.5h-.5c-1.1 14.3-2.4 17.4-25.6 110.5-1.3 5.3-6.1 9.1-11.6 9.1H117c-5.6 0-10.5-3.9-11.7-9.4l-37.8-168c-1.7-7.5 4-14.6 11.7-14.6h24.5c5.7 0 10.7 4 11.8 9.7 15.6 78 20.1 109.5 21 122.2 1.6-10.2 7.3-32.7 29.4-122.7 1.3-5.4 6.1-9.1 11.7-9.1h29.1c5.6 0 10.4 3.8 11.7 9.2 24 100.4 28.8 124 29.6 129.4-.2-11.2-2.6-17.8 21.6-129.2 1-5.6 5.9-9.5 11.5-9.5zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/></svg>',
    xls: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm60.1 106.5L224 336l60.1 93.5c5.1 8-.6 18.5-10.1 18.5h-34.9c-4.4 0-8.5-2.4-10.6-6.3C208.9 405.5 192 373 192 373c-6.4 14.8-10 20-36.6 68.8-2.1 3.9-6.1 6.3-10.5 6.3H110c-9.5 0-15.2-10.5-10.1-18.5l60.3-93.5-60.3-93.5c-5.2-8 .6-18.5 10.1-18.5h34.8c4.4 0 8.5 2.4 10.6 6.3 26.1 48.8 20 33.6 36.6 68.5 0 0 6.1-11.7 36.6-68.5 2.1-3.9 6.2-6.3 10.6-6.3H274c9.5-.1 15.2 10.4 10.1 18.4zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/></svg>',
    xlsx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm60.1 106.5L224 336l60.1 93.5c5.1 8-.6 18.5-10.1 18.5h-34.9c-4.4 0-8.5-2.4-10.6-6.3C208.9 405.5 192 373 192 373c-6.4 14.8-10 20-36.6 68.8-2.1 3.9-6.1 6.3-10.5 6.3H110c-9.5 0-15.2-10.5-10.1-18.5l60.3-93.5-60.3-93.5c-5.2-8 .6-18.5 10.1-18.5h34.8c4.4 0 8.5 2.4 10.6 6.3 26.1 48.8 20 33.6 36.6 68.5 0 0 6.1-11.7 36.6-68.5 2.1-3.9 6.2-6.3 10.6-6.3H274c9.5-.1 15.2 10.4 10.1 18.4zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/></svg>',
    // Add more file types and their corresponding SVG icons here
  };

  return icons[extension] || icons['default'] || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm160-14.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/></svg>';
};

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

const KeyCodes = {
  comma: 188,
  enter: 13,
};

const delimiters = [KeyCodes.comma, KeyCodes.enter];

interface CSVArticleData {
  title: string;
  content: string;
  category: string;
  tags: string;
  isPrivate: string;
  createdAt: string;
  createdBy: string;
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [newArticle, setNewArticle] = useState<{
    title: string;
    content: string;
    category: string;
    files: File[];
    tags: string[]; // Add this line
  }>({
    title: "",
    content: "",
    category: "",
    files: [],
    tags: [], // Add this line
  });
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const { toast } = useToast()
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isViewingArticle, setIsViewingArticle] = useState(false)

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const querySnapshot = await getDocs(collection(db, "articles"))
      const fetchedArticles = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const files = data.files.map((file: {
          name: string;
          url: string;
          extractedText?: string;
          thumbnailUrl?: string;
        }) => ({
          name: file.name,
          url: file.url,
          extractedText: file.extractedText,
          thumbnailUrl: file.thumbnailUrl
        }));
        const extractedText = files.map((file: { extractedText?: string }) => file.extractedText).join(' ');
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          category: data.category,
          files: files,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
          extractedText: extractedText,
          tags: data.tags || [],
          isPrivate: data.isPrivate || false,
          ownerId: data.ownerId || 'anonymous',
          amendments: (data.amendments || []).map((amendment: {
            timestamp: { toDate: () => Date };
            userId: string;
            userEmail: string;
          }) => ({
            timestamp: amendment.timestamp.toDate(),
            userId: amendment.userId,
            userEmail: amendment.userEmail
          })),
          lastModified: data.lastModified?.toDate(),
          lastModifiedBy: data.lastModifiedBy
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

  const filteredArticles = articles.filter(article => {
    const searchMatch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        article.content.toLowerCase().includes(searchTerm.toLowerCase())
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(article.category)
    const tagMatch = selectedTags.length === 0 || selectedTags.some(tag => article.tags.includes(tag))
    return searchMatch && categoryMatch && tagMatch
  })

  const handleAddNew = () => {
    setIsAddingNew(true)
  }

  const handleSave = async (articleToSave: Article) => {
    setLoading(true);
    try {
      if (!articleToSave.title || !articleToSave.content || !articleToSave.category) {
        throw new Error("Title, content, and category are required");
      }
      
      let docRef;
      if (articleToSave.id) {
        docRef = doc(db, "articles", articleToSave.id);
      } else {
        docRef = doc(collection(db, "articles"));
      }

      const articleId = docRef.id;
      const articleFiles: ArticleFile[] = [...(articleToSave.files || [])];

      // Handle new files
      if (articleToSave.newFiles && articleToSave.newFiles.length > 0) {
        for (const file of articleToSave.newFiles) {
          const storageRef = ref(storage, `articles/${articleId}/${file.name}`);
          await uploadBytes(storageRef, file);
          const fileUrl = await getDownloadURL(storageRef);
          
          let extractedText = "";
          try {
            extractedText = await extractTextFromFile(file);
          } catch (error) {
            console.error("Failed to extract text from file:", error);
          }
          const thumbnailUrl = await generateThumbnail(file);
          articleFiles.push({
            name: file.name,
            url: fileUrl,
            extractedText: extractedText || "",
            thumbnailUrl: thumbnailUrl || ""
          });
        }
      }

      const now = new Date();
      const currentUserEmail = user?.email || 'anonymous';

      const articleData = {
        title: articleToSave.title,
        content: articleToSave.content,
        category: articleToSave.category,
        files: articleFiles,
        createdAt: articleToSave.id ? articleToSave.createdAt : now,
        createdBy: articleToSave.id ? articleToSave.createdBy : currentUserEmail,
        tags: articleToSave.tags.map(tag => tag.toLowerCase()),
        isPrivate: articleToSave.isPrivate,
        ownerId: currentUserEmail,
        lastModified: now,
        lastModifiedBy: currentUserEmail,
        amendments: [
          ...(articleToSave.amendments || []),
          {
            timestamp: now,
            userId: user?.uid || 'anonymous',
            userEmail: currentUserEmail
          }
        ]
      };

      if (articleToSave.id) {
        await updateDoc(docRef, articleData);
      } else {
        await setDoc(docRef, articleData);
      }

      console.log("Document written with ID: ", docRef.id);
      toast({
        title: "Success",
        description: `Article ${articleToSave.id ? 'updated' : 'saved'} successfully!`,
      });
      setNewArticle({ title: "", content: "", category: "", files: [], tags: [] });
      setIsAddingNew(false);
      fetchArticles();
    } catch (error) {
      console.error("Error saving article:", error);
      toast({
        title: "Error",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewArticle({ ...newArticle, files: [...newArticle.files, ...Array.from(e.target.files)] })
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

  const handleDeleteArticle = async (articleId: string) => {
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


  const handleUpdateArticle = async (updatedArticle: Article) => {
    setLoading(true);
    try {
      const articleRef = doc(db, "articles", updatedArticle.id);
      const originalArticle = await getDoc(articleRef);
      const originalFiles = originalArticle.data()?.files || [];

      // Delete files that are no longer in the updated article
      await Promise.all(originalFiles.map(async (file: ArticleFile) => {
        if (!updatedArticle.files.some(f => f.name === file.name)) {
          const fileRef = ref(storage, `articles/${updatedArticle.id}/${file.name}`);
          try {
            await deleteObject(fileRef);
            console.log(`File ${file.name} deleted successfully`);
          } catch (error) {
            console.error(`Error deleting file ${file.name}:`, error);
          }
        }
      }));

      // Keep existing files and process new files
      const updatedFiles = [
        ...(updatedArticle.files?.filter(file => file.url) || []),
        ...(await Promise.all((updatedArticle.newFiles || []).map(async (file) => {
          const storageRef = ref(storage, `articles/${updatedArticle.id}/${file.name}`);
          await uploadBytes(storageRef, file);
          const fileUrl = await getDownloadURL(storageRef);
          let extractedText = "";
          try {
            extractedText = await extractTextFromFile(file);
          } catch (error) {
            console.error("Failed to extract text from file:", error);
          }
          const thumbnailUrl = await generateThumbnail(file);
          return {
            name: file.name,
            url: fileUrl,
            extractedText: extractedText || "",
            thumbnailUrl: thumbnailUrl || ""
          };
        })))
      ];

      const now = new Date();
      const currentUserEmail = user?.email || 'anonymous';

      // Create a new object with only the fields we want to update in Firestore
      const articleUpdateData = {
        title: updatedArticle.title,
        content: updatedArticle.content,
        category: updatedArticle.category,
        tags: updatedArticle.tags,
        files: updatedFiles,
        isPrivate: updatedArticle.isPrivate,
        lastModified: now,
        lastModifiedBy: currentUserEmail,
        amendments: [
          ...(originalArticle.data()?.amendments || []),
          {
            timestamp: now,
            userId: user?.uid || 'anonymous',
            userEmail: currentUserEmail
          }
        ]
      };

      await updateDoc(articleRef, articleUpdateData);
      toast({
        title: "Success",
        description: "Article updated successfully!",
      });
      setSelectedArticle(null);
      setIsViewingArticle(false);
      fetchArticles();
    } catch (error) {
      console.error("Error updating article:", error);
      toast({
        title: "Error",
        description: "Failed to update article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    if (selectedArticle) {
      const updatedFiles = [...selectedArticle.files];
      updatedFiles.splice(index, 1);
      setSelectedArticle({ ...selectedArticle, files: updatedFiles });
    }
  };

  const handleDeleteTag = (i: number) => {
    setTags(tags.filter((tag, index) => index !== i));
  };

  const handleAddition = (tag: { id: string; text: string }) => {
    const lowercaseTag = { id: tag.text.toLowerCase(), text: tag.text.toLowerCase() };
    setTags([...tags, lowercaseTag]);
  };

  const handleDrag = (tag: { id: string; text: string }, currPos: number, newPos: number) => {
    const newTags = tags.slice();
    newTags.splice(currPos, 1);
    newTags.splice(newPos, 0, tag);
    setTags(newTags);
  };

  const handleCancelNewArticle = () => {
    setIsAddingNew(false);
    setNewArticle({
      title: "",
      content: "",
      category: "",
      files: [],
      tags: [],
    });
  };

  const handleSaveArticle = async (updatedArticle: Article) => {
    setLoading(true)
    try {
      await updateDoc(doc(db, "articles", updatedArticle.id), {
        title: updatedArticle.title,
        content: updatedArticle.content,
        category: updatedArticle.category,
        tags: updatedArticle.tags,
      })
      toast({
        title: "Success",
        description: "Article updated successfully!",
      })
      fetchArticles()
    } catch (error) {
      console.error("Failed to update article:", error)
      toast({
        title: "Error",
        description: "Failed to update article. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }
  
  const getAllTags = () => {
    return Array.from(new Set(articles.flatMap(article => article.tags))).sort((a, b) => a.localeCompare(b))
  }

  const handleOpenArticle = (article: Article) => {
    setSelectedArticle(article);
    setIsViewingArticle(true);
  };

  const handleCloseArticle = () => {
    setSelectedArticle(null);
    setIsViewingArticle(false);
  };

  const exportToCSV = () => {
    const csvData = filteredArticles.map(article => ({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags.join(', '),
      isPrivate: article.isPrivate,
      createdAt: article.createdAt.toISOString(),
      createdBy: article.createdBy,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'knowledge_base_export.csv');
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse<CSVArticleData>(file, {
        complete: async (results) => {
          const importedArticles = results.data.map((row) => ({
            title: row.title,
            content: row.content,
            category: row.category,
            tags: row.tags.split(',').map((tag) => tag.trim()),
            isPrivate: row.isPrivate === 'true',
            createdAt: new Date(row.createdAt),
            createdBy: row.createdBy,
            ownerId: user?.uid || 'anonymous',
          }));

          for (const article of importedArticles) {
            await handleSave(article as Article);
          }

          toast({
            title: "Success",
            description: `Imported ${importedArticles.length} articles.`,
          });
          fetchArticles();
        },
        header: true,
        skipEmptyLines: true,
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onSignIn={handleSignIn}
        articleCount={filteredArticles.length}
      />
      <div className="p-4 flex">
        <div className="w-full pr-4">
          <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>
          <div className="flex space-x-4 mb-8">
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Article
            </Button>
            <Button onClick={exportToCSV} title="Export to CSV">
              <Download className="h-4 w-4" />
            </Button>
            <label className="cursor-pointer">
              <Input
                id="csvFileInput"
                type="file"
                accept=".csv"
                onChange={importFromCSV}
                className="hidden"
              />
              <Button onClick={() => document.getElementById('csvFileInput')?.click()} title="Import from CSV">
                <Upload className="h-4 w-4" />
              </Button>
            </label>
          </div>
          
          {isAddingNew && (
            <ArticleModal
              mode="add"
              article={null}
              onClose={() => setIsAddingNew(false)}
              onSave={handleSave}
              categories={categories}
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map((article) => (
              <Card 
                key={article.id} 
                className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 shadow-md relative cursor-pointer"
                onClick={() => handleOpenArticle(article)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteArticle(article.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{article.category}</p>
                  <div className="text-sm text-gray-700 mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: article.content }} />
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map(tag => (
                      <span key={tag} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center p-4 bg-gray-50">
                  <div className="flex items-center space-x-2">
                    {article.files && article.files.length > 0 && (
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    )}
                    {article.isPrivate && (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="w-64 bg-white p-4 shadow-md overflow-y-auto"> {/* Adjusted width and removed fixed positioning */}
        <h2 className="text-lg font-bold mb-3">Filters</h2>
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2">Categories</h3>
            {categories.map(category => (
              <div key={category} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id={`category-${category}`}
                  checked={selectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="mr-2"
                />
                <label htmlFor={`category-${category}`} className="text-sm">{category}</label>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-md font-semibold mb-2">Tags</h3>
            {getAllTags().map(tag => (
              <div key={tag} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id={`tag-${tag}`}
                  checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="mr-2"
                />
                <label htmlFor={`tag-${tag}`} className="text-sm">{tag}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Toaster />
      {isViewingArticle && selectedArticle && (
        <ArticleModal
          mode="view"
          article={selectedArticle}
          onClose={handleCloseArticle}
          onSave={handleUpdateArticle}
          categories={categories}
        />
      )}
    </div>
  )
}
