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
        setError('Enter text to encrypt.')
        setRightText('')
        return
      }

      if (!key.trim()) {
        setError('Enter an encryption key.')
        setRightText('')
        return
      }

      const requiresIV = algorithms.find(a => a.value === algorithm)?.requiresIV

      if (requiresIV && !iv.trim()) {
        setError('This mode requires an IV.')
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
          setError('Invalid Base64 input.')
          setRightText('')
          return
        }
      }

      const result = CryptoJS.AES.encrypt(inputText, key, options).toString()
      setRightText(result)
      setError('')
    } catch (_err) {
      setError('Encryption failed.')
      setRightText('')
    }
  }

  const processDecrypt = () => {
    try {
      if (!rightText.trim()) {
        setError('Enter text to decrypt.')
        setLeftText('')
        return
      }

      if (!key.trim()) {
        setError('Enter an encryption key.')
        setLeftText('')
        return
      }

      const requiresIV = algorithms.find(a => a.value === algorithm)?.requiresIV

      if (requiresIV && !iv.trim()) {
        setError('This mode requires an IV.')
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
          setError('Invalid Base64 input.')
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
        setError('Decryption failed. Check the key, IV, and input.')
        setLeftText('')
      }
    } catch (_err) {
      setError('Decryption failed.')
      setLeftText('')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard.')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  const textareaClass =
    "field-input h-[300px] resize-none font-mono text-sm"

  return (
    <div>
      <header>
        <p className="mono-label">🔐 secret scrambler</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Encryptor</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Scramble text with AES and friends. Unscramble it too — everything stays in your browser, pinky promise.
        </p>
      </header>

      <section className="card-surface mt-8 p-5 sm:p-6">
        <p className="mono-label mb-4">⚙️ settings</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="algorithm">AES mode</Label>
            <select
              id="algorithm"
              className="field-input appearance-none font-mono"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
            >
              {algorithms.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Your secret key"
                className="font-mono"
              />
            </div>

            {algorithms.find(a => a.value === algorithm)?.requiresIV && (
              <div className="space-y-2">
                <Label htmlFor="iv">Initialization vector (IV)</Label>
                <Input
                  id="iv"
                  type="text"
                  value={iv}
                  onChange={(e) => setIv(e.target.value)}
                  placeholder="IV"
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="base64-input"
              checked={useBase64Input}
              onChange={(e) => setUseBase64Input(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-foreground accent-[var(--candy-pink)]"
            />
            <Label htmlFor="base64-input">Input is Base64 encoded</Label>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border-2 border-foreground bg-red-100 px-4 py-2.5 text-sm font-bold text-red-700">
          😬 {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-surface space-y-4 p-5 sm:p-6">
          <div className="flex h-8 items-center justify-between">
            <Label htmlFor="plaintext" className="mono-label">📝 your text</Label>
            {leftText && (
              <Button
                onClick={() => copyToClipboard(leftText)}
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
            id="plaintext"
            className={textareaClass}
            value={leftText}
            onChange={(e) => setLeftText(e.target.value)}
            placeholder="Type or paste your secret message here…"
            spellCheck={false}
          />
          <Button
            onClick={processEncrypt}
            className="w-full"
          >
            <LockIcon className="mr-2 h-4 w-4" />
            Scramble it
          </Button>
        </div>

        <div className="card-surface space-y-4 p-5 sm:p-6">
          <div className="flex h-8 items-center justify-between">
            <Label htmlFor="ciphertext" className="mono-label">🔒 scrambled text</Label>
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
            className={textareaClass}
            value={rightText}
            onChange={(e) => setRightText(e.target.value)}
            placeholder="Paste the scrambled gibberish here…"
            spellCheck={false}
          />
          <Button
            onClick={processDecrypt}
            className="w-full"
          >
            <UnlockIcon className="mr-2 h-4 w-4" />
            Unscramble it
          </Button>
        </div>
      </div>
    </div>
  )
}
