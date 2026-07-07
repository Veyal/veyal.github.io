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
        setError('Psst — paste some JSON first, then we can work our magic ✨')
        return
      }

      const parsed = JSON.parse(input)
      const beautified = JSON.stringify(parsed, null, 2)
      setOutput(beautified)
      setError('')
    } catch (err) {
      console.log(err)
      setError('Hmm, that JSON is a little too tangled — check for missing commas or quotes!')
      setOutput('')
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output)
      .then(() => {
        alert('Copied! Go paste it somewhere safe 🕊️')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div>
      <header>
        <p className="mono-label">🪄 spaghetti untangler</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          JSON Beautifier
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          Paste JSON spaghetti on the left, get JSON lasagna on the right. Nothing ever leaves your browser, pinky promise.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        {/* Input Section */}
        <div className="flex-1">
          <div className="mb-2 flex h-6 items-center">
            <Label htmlFor="json-input" className="mono-label">🍝 messy spaghetti</Label>
          </div>
          <textarea
            id="json-input"
            className="field-input h-[500px] resize-none font-mono"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your tangled JSON here..."
            spellCheck={false}
          />
          <Button
            onClick={beautifyJson}
            className="mt-4 w-full"
          >
            Untangle it! 🪄
          </Button>
        </div>

        {/* Output Section */}
        <div className="flex-1">
          <div className="mb-2 flex h-6 items-center justify-between">
            <Label htmlFor="json-output" className="mono-label">🥘 tidy lasagna</Label>
            {output && (
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CopyIcon className="h-4 w-4" />
                Copy
              </Button>
            )}
          </div>
          <div className="h-[500px] overflow-auto">
            <textarea
              id="json-output"
              className={`field-input h-full resize-none font-mono ${error ? 'text-red-600 font-bold' : ''}`}
              value={error || output}
              readOnly
              placeholder="Your beautifully layered JSON will appear here..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
