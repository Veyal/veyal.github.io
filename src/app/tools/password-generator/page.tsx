'use client'

import { useState, useEffect } from 'react'
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CopyIcon, RefreshCwIcon } from "lucide-react"

export default function PasswordGenerator() {
  const [length, setLength] = useState(12)
  const [useAlphabet, setUseAlphabet] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSpecialChars, setUseSpecialChars] = useState(true)
  const [customChars, setCustomChars] = useState('')
  const [password, setPassword] = useState('')

  const generatePassword = () => {
    let chars = ''
    if (useAlphabet) chars += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (useNumbers) chars += '0123456789'
    if (useSpecialChars) chars += '!@#$%^&*()_+[]{}|;:,.<>?'
    chars += customChars

    if (chars.length === 0) {
      setPassword('Please select at least one character type')
      return
    }

    // CSPRNG with rejection sampling to avoid modulo bias
    const maxValid = Math.floor(0x100000000 / chars.length) * chars.length
    let newPassword = ''
    while (newPassword.length < length) {
      const words = new Uint32Array(length)
      crypto.getRandomValues(words)
      for (let i = 0; i < words.length; i++) {
        const w = words[i]
        if (w < maxValid && newPassword.length < length) {
          newPassword += chars.charAt(w % chars.length)
        }
      }
    }
    setPassword(newPassword)
  }

  useEffect(() => {
    generatePassword()
  }, [length, useAlphabet, useNumbers, useSpecialChars, customChars])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password)
      .then(() => {
        alert('Copied! Go paste it somewhere safe 🕊️')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header>
        <p className="mono-label">🎲 password machine</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Password Generator
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          Passwords so random even I can&apos;t guess them — and that&apos;s literally my job.
        </p>
      </header>

      <div className="card-surface mt-8 p-6">
        <p className="mono-label">✨ your shiny new password</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-grow overflow-x-auto rounded-xl border-2 border-[var(--ink)] bg-[#ffc94d]/15 px-4 py-3">
            <code className="whitespace-nowrap font-mono text-sm text-foreground">
              {password}
            </code>
          </div>
          <Button onClick={copyToClipboard} variant="outline" size="icon" title="Copy to clipboard">
            <CopyIcon className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={generatePassword} className="mt-4 w-full">
          <RefreshCwIcon className="mr-2 h-4 w-4" /> Roll again!
        </Button>
      </div>

      <div className="card-surface mt-6 p-6">
        <p className="mono-label">🎛️ mix your ingredients</p>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="length-slider">How long should it be?</Label>
            <span className="chip">{length}</span>
          </div>
          <Slider
            id="length-slider"
            min={4}
            max={32}
            step={1}
            value={[length]}
            onValueChange={(value) => setLength(value[0])}
            className="mt-3"
          />
        </div>

        <div className="mt-6 space-y-4 border-t-2 border-dashed border-[#2b2735]/15 pt-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="use-alphabet" className="text-foreground/70">
              Letters (abc… you know)
            </Label>
            <Switch
              id="use-alphabet"
              checked={useAlphabet}
              onCheckedChange={setUseAlphabet}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="use-numbers" className="text-foreground/70">
              Numbers (0–9, the classics)
            </Label>
            <Switch
              id="use-numbers"
              checked={useNumbers}
              onCheckedChange={setUseNumbers}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="use-special-chars" className="text-foreground/70">
              Weird symbols (!@#$ and friends)
            </Label>
            <Switch
              id="use-special-chars"
              checked={useSpecialChars}
              onCheckedChange={setUseSpecialChars}
            />
          </div>
        </div>

        <div className="mt-6 border-t-2 border-dashed border-[#2b2735]/15 pt-5">
          <Label htmlFor="custom-chars">Secret extra ingredients</Label>
          <Input
            id="custom-chars"
            type="text"
            placeholder="Toss any extra characters into the pot"
            className="mt-2 font-mono"
            value={customChars}
            onChange={(e) => setCustomChars(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
