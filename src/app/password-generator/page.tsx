'use client'

import { useState, useEffect } from 'react'
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CopyIcon, RefreshCwIcon } from "lucide-react"

export default function PasswordGenerator() {
  const [length, setLength] = useState(8)
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

    let newPassword = ''
    for (let i = 0; i < length; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(newPassword)
  }

  useEffect(() => {
    generatePassword()
  }, [length, useAlphabet, useNumbers, useSpecialChars, customChars])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password)
      .then(() => {
        alert('Password copied to clipboard!')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Password Generator</h1>
      
      <div className="mb-4">
        <Label htmlFor="length-slider" className="block mb-2">Password Length: {length}</Label>
        <Slider
          id="length-slider"
          min={4}
          max={32}
          step={1}
          value={[length]}
          onValueChange={(value) => setLength(value[0])}
          className="mb-2"
        />
      </div>

      <div className="space-y-4 mb-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="use-alphabet">Use Alphabet</Label>
          <Switch
            id="use-alphabet"
            checked={useAlphabet}
            onCheckedChange={setUseAlphabet}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="use-numbers">Use Numbers</Label>
          <Switch
            id="use-numbers"
            checked={useNumbers}
            onCheckedChange={setUseNumbers}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="use-special-chars">Use Special Characters</Label>
          <Switch
            id="use-special-chars"
            checked={useSpecialChars}
            onCheckedChange={setUseSpecialChars}
          />
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="custom-chars" className="block mb-2">Custom Characters</Label>
        <Input
          id="custom-chars"
          type="text"
          placeholder="Add your own characters"
          value={customChars}
          onChange={(e) => setCustomChars(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <Label htmlFor="generated-password" className="block mb-2">Generated Password</Label>
        <div className="flex">
          <Input
            id="generated-password"
            type="text"
            readOnly
            value={password}
            className="flex-grow"
          />
          <Button onClick={copyToClipboard} className="ml-2" title="Copy to clipboard">
            <CopyIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button onClick={generatePassword} className="w-full">
        <RefreshCwIcon className="mr-2 h-4 w-4" /> Generate New Password
      </Button>
    </div>
  )
}