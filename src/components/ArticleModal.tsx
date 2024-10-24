import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Save } from 'lucide-react'
import { Article, ArticleFile } from './KnowledgeBase'  // Import the Article and ArticleFile interfaces
import dynamic from 'next/dynamic'
import { WithContext as ReactTags } from 'react-tag-input'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface ArticleModalProps {
  mode: 'view' | 'edit' | 'add'
  article: Article | null
  onClose: () => void
  onSave: (updatedArticle: Article) => void
  categories: string[]
}

export function ArticleModal({ mode, article, onClose, onSave, categories }: ArticleModalProps) {
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'add')
  const [editedArticle, setEditedArticle] = useState<Article>(
    article || {
      id: '',
      title: '',
      content: '',
      category: '',
      tags: [],
      files: [],
      createdAt: new Date(),
      createdBy: '',
      extractedText: ''
    }
  )

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    const updatedArticle = {
      ...editedArticle,
      files: [...editedArticle.files, ...(editedArticle.newFiles || []).map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        extractedText: '',
        thumbnailUrl: ''
      }))]
    };
    onSave(updatedArticle);
    onClose();
  }

  const handleCancel = () => {
    if (mode === 'add') {
      onClose()
    } else {
      setEditedArticle(article!)
      setIsEditing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            {isEditing ? (
              <Input
                value={editedArticle.title}
                onChange={(e) => setEditedArticle({ ...editedArticle, title: e.target.value })}
                className="text-2xl font-bold flex-grow mr-2"
                placeholder="Enter article title..."
              />
            ) : (
              <div className="flex items-center space-x-2 flex-grow">
                <CardTitle className="text-2xl">{editedArticle.title}</CardTitle>
                <span className="text-sm text-muted-foreground">({editedArticle.category})</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isEditing && (
            <Select
              value={editedArticle.category}
              onValueChange={(value) => setEditedArticle({ ...editedArticle, category: value })}
            >
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
          )}
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              {editedArticle.tags.map(tag => (
                <span key={tag} className="bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <>
              <ReactQuill
                value={editedArticle.content}
                onChange={(content) => setEditedArticle({ ...editedArticle, content })}
                className="mb-4"
              />
              <div className="space-y-2 mt-4">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <ReactTags
                  tags={editedArticle.tags.map(tag => ({ id: tag, text: tag, className: 'react-tags__tag' }))}
                  handleDelete={(i) => {
                    const newTags = [...editedArticle.tags];
                    newTags.splice(i, 1);
                    setEditedArticle({ ...editedArticle, tags: newTags });
                  }}
                  handleAddition={(tag) => {
                    setEditedArticle({ ...editedArticle, tags: [...editedArticle.tags, tag.text] });
                  }}
                  delimiters={[188, 13]} // comma and enter
                  inputFieldPosition="bottom"
                  placeholder="Add new tag..."
                  classNames={{
                    tags: 'react-tags__tags',
                    tagInput: 'react-tags__tagInput',
                    tagInputField: 'react-tags__tagInputField',
                    selected: 'react-tags__selected',
                    tag: 'react-tags__tag',
                    remove: 'react-tags__remove',
                    suggestions: 'react-tags__suggestions',
                    activeSuggestion: 'react-tags__activeSuggestion',
                    editTagInput: 'react-tags__editTagInput',
                    editTagInputField: 'react-tags__editTagInputField',
                    clearAll: 'react-tags__clearAll'
                  }}
                />
              </div>
              <div className="space-y-2 mt-4">
                <label htmlFor="files" className="block text-sm font-medium text-gray-700">
                  Attach Files
                </label>
                <Input
                  type="file"
                  id="files"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setEditedArticle({ ...editedArticle, newFiles: [...(editedArticle.newFiles || []), ...files] });
                  }}
                />
              </div>
              {editedArticle.newFiles && editedArticle.newFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-700">New Files:</h4>
                  <ul className="list-disc pl-5">
                    {editedArticle.newFiles.map((file, index) => (
                      <li key={index} className="text-sm text-gray-600">{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <div dangerouslySetInnerHTML={{ __html: editedArticle.content }} />
            </>
          )}
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Attached Files:</h3>
            {editedArticle.files.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                {file.thumbnailUrl && (
                  <img src={file.thumbnailUrl} alt={file.name} className="w-10 h-10 object-cover" />
                )}
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  {file.name}
                </a>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="mr-2">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button onClick={handleCancel} variant="outline">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>Edit</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
