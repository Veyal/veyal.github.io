'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CopyIcon } from "lucide-react"

export default function JsonBeautifier() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const beautifyJson = () => {
    try {
      if (!input.trim()) {
        setOutput('')
        setError('Please enter JSON to beautify')
        return
      }
      
      const parsed = JSON.parse(input)
      const beautified = JSON.stringify(parsed, null, 2)
      setOutput(beautified)
      setError('')
    } catch (err) {
      console.log(err)
      setError('Invalid JSON format')
      setOutput('')
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output)
      .then(() => {
        alert('(>^_^)> Poyo! I copied the pretty JSON to your clipboard! <(^_^<)')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6">
      <h1 className="text-4xl font-black mb-8 text-center bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">JSON Beautifier</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Input Section */}
        <div className="flex-1">
          <Label htmlFor="json-input" className="block mb-2 h-6">Input JSON</Label>
          <textarea
            id="json-input"
            className="w-full h-[500px] p-4 rounded-2xl border-2 border-pink-300 bg-white dark:bg-gray-800 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-pink-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
          />
          <Button 
            onClick={beautifyJson} 
            className="mt-4 w-full"
          >
            Beautify
          </Button>
        </div>

        {/* Output Section */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2 h-6">
            <Label htmlFor="json-output">Beautified JSON</Label>
            {output && (
              <Button 
                onClick={copyToClipboard} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <CopyIcon className="h-4 w-4 mh-1" />
                Copy
              </Button>
            )}
          </div>
          <div className="h-[500px] overflow-auto">
            <textarea
              id="json-output"
              className="w-full h-full p-4 rounded-2xl border-2 border-pink-300 bg-white dark:bg-gray-800 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-pink-400"
              value={error || output}
              style={{ color: error ? '#ef4444' : 'inherit' }}
              readOnly
              placeholder="Beautified JSON will appear here..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
