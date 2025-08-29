'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CopyIcon, LockIcon, UnlockIcon } from "lucide-react"
import CryptoJS from 'crypto-js'

// Add type for CryptoJS options
type CryptoOptions = {
  mode: typeof CryptoJS.mode[keyof typeof CryptoJS.mode];
  padding: typeof CryptoJS.pad.Pkcs7;
  iv?: CryptoJS.lib.WordArray;
}

export default function Encryptor() {
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [key, setKey] = useState('')
  const [iv, setIv] = useState('')
  const [error, setError] = useState('')
  const [algorithm, setAlgorithm] = useState('CBC')
  const [useBase64Input, setUseBase64Input] = useState(false)

  const algorithms = [
    { value: 'CBC', label: 'AES-CBC', requiresIV: true },
    { value: 'CFB', label: 'AES-CFB', requiresIV: true },
    { value: 'CTR', label: 'AES-CTR', requiresIV: true },
    { value: 'OFB', label: 'AES-OFB', requiresIV: true },
    { value: 'ECB', label: 'AES-ECB', requiresIV: false }
  ]

  const processEncrypt = () => {
    try {
      if (!leftText.trim()) {
        setError('Please enter text to encrypt')
        setRightText('')
        return
      }

      if (!key.trim()) {
        setError('Please enter an encryption key')
        setRightText('')
        return
      }

      const requiresIV = algorithms.find(a => a.value === algorithm)?.requiresIV

      if (requiresIV && !iv.trim()) {
        setError('This mode requires an IV')
        setRightText('')
        return
      }

      const options: CryptoOptions = {
        mode: CryptoJS.mode[algorithm as keyof typeof CryptoJS.mode],
        padding: CryptoJS.pad.Pkcs7
      }

      if (requiresIV) {
        options.iv = CryptoJS.enc.Utf8.parse(iv)
      }

      let inputText = leftText
      if (useBase64Input) {
        try {
          inputText = CryptoJS.enc.Base64.parse(leftText).toString(CryptoJS.enc.Utf8)
        } catch (_e) {
          setError('Invalid Base64 input')
          setRightText('')
          return
        }
      }

      const result = CryptoJS.AES.encrypt(inputText, key, options).toString()
      setRightText(result)
      setError('')
    } catch (_err) {
      setError('An error occurred during encryption')
      setRightText('')
    }
  }

  const processDecrypt = () => {
    try {
      if (!rightText.trim()) {
        setError('Please enter text to decrypt')
        setLeftText('')
        return
      }

      if (!key.trim()) {
        setError('Please enter an encryption key')
        setLeftText('')
        return
      }

      const requiresIV = algorithms.find(a => a.value === algorithm)?.requiresIV

      if (requiresIV && !iv.trim()) {
        setError('This mode requires an IV')
        setLeftText('')
        return
      }

      const options: CryptoOptions = {
        mode: CryptoJS.mode[algorithm as keyof typeof CryptoJS.mode],
        padding: CryptoJS.pad.Pkcs7
      }

      if (requiresIV) {
        options.iv = CryptoJS.enc.Utf8.parse(iv)
      }

      let inputText = rightText
      if (useBase64Input) {
        try {
          inputText = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Base64.parse(rightText))
        } catch (_e) {
          setError('Invalid Base64 input')
          setLeftText('')
          return
        }
      }

      try {
        const result = CryptoJS.AES.decrypt(inputText, key, options).toString(CryptoJS.enc.Utf8)
        if (!result) {
          throw new Error('Decryption failed')
        }
        setLeftText(result)
        setError('')
      } catch (_e) {
        setError('Failed to decrypt. Check your key, IV, and input.')
        setLeftText('')
      }
    } catch (_err) {
      setError('An error occurred during decryption')
      setLeftText('')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Text copied to clipboard!')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6">
      <h1 className="text-4xl font-black mb-8 text-center bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">AES Encryptor/Decryptor</h1>

      <div className="space-y-6 mb-6">
        <div>
          <Label htmlFor="algorithm">AES Mode</Label>
          <select
            id="algorithm"
            className="w-full p-3 rounded-full border-2 border-pink-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
          >
            {algorithms.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="key">Encryption Key</Label>
            <Input
              id="key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter encryption key"
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {algorithms.find(a => a.value === algorithm)?.requiresIV && (
            <div>
              <Label htmlFor="iv">Initialization Vector (IV)</Label>
              <Input
                id="iv"
                type="text"
                value={iv}
                onChange={(e) => setIv(e.target.value)}
                placeholder="Enter IV"
                className="bg-white dark:bg-gray-800"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="base64-input"
              checked={useBase64Input}
              onChange={(e) => setUseBase64Input(e.target.checked)}
            />
            <Label htmlFor="base64-input">Input is Base64 encoded</Label>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 rounded-full px-4 py-2 mb-4 text-center text-red-600 dark:text-red-400 font-semibold">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center h-6">
            <Label htmlFor="plaintext">Plaintext</Label>
            {leftText && (
              <Button
                onClick={() => copyToClipboard(leftText)}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <CopyIcon className="h-4 w-4" />
                Copy
              </Button>
            )}
          </div>
          <textarea
            id="plaintext"
            className="w-full h-[300px] p-4 rounded-2xl border-2 border-pink-300 bg-white dark:bg-gray-800 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-pink-400"
            value={leftText}
            onChange={(e) => setLeftText(e.target.value)}
            placeholder="Enter text to encrypt..."
          />
          <Button 
            onClick={processEncrypt}
            className="w-full"
          >
            <LockIcon className="mr-2 h-4 w-4" />
            Encrypt →
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center h-6">
            <Label htmlFor="ciphertext">Ciphertext</Label>
            {rightText && (
              <Button
                onClick={() => copyToClipboard(rightText)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CopyIcon className="h-4 w-4" />
                Copy
              </Button>
            )}
          </div>
          <textarea
            id="ciphertext"
            className="w-full h-[300px] p-4 rounded-2xl border-2 border-pink-300 bg-white dark:bg-gray-800 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-pink-400"
            value={rightText}
            onChange={(e) => setRightText(e.target.value)}
            placeholder="Enter text to decrypt..."
          />
          <Button 
            onClick={processDecrypt}
            className="w-full"
          >
            <UnlockIcon className="mr-2 h-4 w-4" />
            ← Decrypt
          </Button>
        </div>
      </div>
    </div>
  )
}
