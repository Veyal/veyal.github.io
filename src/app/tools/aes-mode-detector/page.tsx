"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Shield, Key, Search } from "lucide-react"
import crypto from 'crypto-browserify'
import { Buffer } from 'buffer'

// Make Buffer available globally for crypto-browserify
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
}

interface DetectionResult {
  mode: string
  success: boolean
  decrypted?: string
  error?: string
  confidence: number
  details?: string
}

export default function AESModeDetectorPage() {
  const [ciphertext, setCiphertext] = useState("")
  const [key, setKey] = useState("")
  const [iv, setIv] = useState("")
  const [results, setResults] = useState<DetectionResult[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [inputFormat, setInputFormat] = useState<'hex' | 'base64'>('hex')
  const [keyFormat, setKeyFormat] = useState<'hex' | 'base64' | 'utf8'>('hex')

  const aesModesToTest = [
    { name: 'AES-128-ECB', keySize: 16, needsIV: false },
    { name: 'AES-192-ECB', keySize: 24, needsIV: false },
    { name: 'AES-256-ECB', keySize: 32, needsIV: false },
    { name: 'AES-128-CBC', keySize: 16, needsIV: true },
    { name: 'AES-192-CBC', keySize: 24, needsIV: true },
    { name: 'AES-256-CBC', keySize: 32, needsIV: true },
    { name: 'AES-128-CFB', keySize: 16, needsIV: true },
    { name: 'AES-192-CFB', keySize: 24, needsIV: true },
    { name: 'AES-256-CFB', keySize: 32, needsIV: true },
    { name: 'AES-128-OFB', keySize: 16, needsIV: true },
    { name: 'AES-192-OFB', keySize: 24, needsIV: true },
    { name: 'AES-256-OFB', keySize: 32, needsIV: true },
    { name: 'AES-128-CTR', keySize: 16, needsIV: true },
    { name: 'AES-192-CTR', keySize: 24, needsIV: true },
    { name: 'AES-256-CTR', keySize: 32, needsIV: true },
  ]

  const tryDecrypt = (
    cipherBuffer: Buffer,
    keyBuffer: Buffer,
    mode: string,
    ivBuffer?: Buffer
  ): { success: boolean; decrypted?: string; error?: string } => {
    try {
      // Map mode names to crypto algorithm names
      let algorithm = ''
      const keySize = keyBuffer.length * 8 // Convert bytes to bits
      
      // Determine algorithm based on key size and mode
      if (mode.includes('ECB')) {
        if (keySize === 128) algorithm = 'aes-128-ecb'
        else if (keySize === 192) algorithm = 'aes-192-ecb'
        else if (keySize === 256) algorithm = 'aes-256-ecb'
      } else if (mode.includes('CBC')) {
        if (keySize === 128) algorithm = 'aes-128-cbc'
        else if (keySize === 192) algorithm = 'aes-192-cbc'
        else if (keySize === 256) algorithm = 'aes-256-cbc'
      } else if (mode.includes('CFB')) {
        if (keySize === 128) algorithm = 'aes-128-cfb'
        else if (keySize === 192) algorithm = 'aes-192-cfb'
        else if (keySize === 256) algorithm = 'aes-256-cfb'
      } else if (mode.includes('OFB')) {
        if (keySize === 128) algorithm = 'aes-128-ofb'
        else if (keySize === 192) algorithm = 'aes-192-ofb'
        else if (keySize === 256) algorithm = 'aes-256-ofb'
      } else if (mode.includes('CTR')) {
        if (keySize === 128) algorithm = 'aes-128-ctr'
        else if (keySize === 192) algorithm = 'aes-192-ctr'
        else if (keySize === 256) algorithm = 'aes-256-ctr'
      }
      
      if (!algorithm) {
        return { success: false, error: `Unsupported algorithm: ${mode}` }
      }
      
      if (mode.includes('ECB')) {
        // ECB mode doesn't need IV
        const decipher = crypto.createDecipheriv(algorithm, keyBuffer, Buffer.alloc(0))
        decipher.setAutoPadding(true)
        let decrypted = decipher.update(cipherBuffer)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        
        // Check if result is readable text
        const text = decrypted.toString('utf8')
        if (isPrintableText(text)) {
          return { success: true, decrypted: text }
        }
        return { success: false, error: 'Decrypted data is not readable text' }
      } else {
        // Other modes need IV
        if (!ivBuffer || ivBuffer.length !== 16) {
          return { success: false, error: 'Invalid or missing IV for this mode' }
        }
        
        const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer)
        decipher.setAutoPadding(true)
        let decrypted = decipher.update(cipherBuffer)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        
        const text = decrypted.toString('utf8')
        if (isPrintableText(text)) {
          return { success: true, decrypted: text }
        }
        return { success: false, error: 'Decrypted data is not readable text' }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const isPrintableText = (text: string): boolean => {
    // Check if text contains mostly printable characters
    const printableCount = text.split('').filter(char => {
      const code = char.charCodeAt(0)
      return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13
    }).length
    
    return printableCount / text.length > 0.95 && text.length > 0
  }

  const detectAESMode = async () => {
    setIsDetecting(true)
    setResults([])
    
    try {
      // Parse input based on format
      let cipherBuffer: Buffer
      let keyBuffer: Buffer
      let ivBuffer: Buffer | undefined
      
      // Parse ciphertext
      if (inputFormat === 'hex') {
        cipherBuffer = Buffer.from(ciphertext.replace(/\s/g, ''), 'hex')
      } else {
        cipherBuffer = Buffer.from(ciphertext.replace(/\s/g, ''), 'base64')
      }
      
      // Parse key based on key format
      if (keyFormat === 'hex') {
        keyBuffer = Buffer.from(key.replace(/\s/g, ''), 'hex')
      } else if (keyFormat === 'base64') {
        keyBuffer = Buffer.from(key.replace(/\s/g, ''), 'base64')
      } else {
        // UTF-8 string key
        keyBuffer = Buffer.from(key, 'utf8')
      }
      
      // Parse IV if provided
      if (iv) {
        if (inputFormat === 'hex') {
          ivBuffer = Buffer.from(iv.replace(/\s/g, ''), 'hex')
        } else {
          ivBuffer = Buffer.from(iv.replace(/\s/g, ''), 'base64')
        }
      }
      
      const detectionResults: DetectionResult[] = []
      
      for (const mode of aesModesToTest) {
        // Adjust key size if needed
        let adjustedKey = keyBuffer
        if (keyBuffer.length < mode.keySize) {
          // Pad key with zeros if too short
          adjustedKey = Buffer.concat([keyBuffer, Buffer.alloc(mode.keySize - keyBuffer.length)])
        } else if (keyBuffer.length > mode.keySize) {
          // Truncate key if too long
          adjustedKey = keyBuffer.slice(0, mode.keySize)
        }
        
        const result = tryDecrypt(cipherBuffer, adjustedKey, mode.name, ivBuffer)
        
        if (result.success) {
          detectionResults.push({
            mode: mode.name,
            success: true,
            decrypted: result.decrypted,
            confidence: 100,
            details: `Successfully decrypted with ${mode.name}`
          })
        } else {
          detectionResults.push({
            mode: mode.name,
            success: false,
            error: result.error,
            confidence: 0,
            details: `Failed: ${result.error}`
          })
        }
      }
      
      // Sort results by success
      detectionResults.sort((a, b) => (b.success ? 1 : 0) - (a.success ? 1 : 0))
      setResults(detectionResults)
      
    } catch (error: any) {
      setResults([{
        mode: 'Error',
        success: false,
        error: error.message,
        confidence: 0
      }])
    } finally {
      setIsDetecting(false)
    }
  }

  const generateExample = () => {
    try {
      // Generate an example encrypted text
      const plaintext = "Hello, this is a test message for AES mode detection!"
      const testKey = crypto.randomBytes(32) // 256-bit key
      const testIv = crypto.randomBytes(16) // 128-bit IV
      
      // Encrypt with AES-256-CBC as example
      const cipher = crypto.createCipheriv('aes-256-cbc', testKey, testIv)
      cipher.setAutoPadding(true)
      let encrypted = cipher.update(plaintext, 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      
      setCiphertext(encrypted.toString('hex'))
      setKey(testKey.toString('hex'))
      setIv(testIv.toString('hex'))
      setInputFormat('hex')
      setKeyFormat('hex')
    } catch (error) {
      console.error('Error generating example:', error)
      // Fallback to pre-generated example
      setCiphertext('a5c4b3f2e1d0c9b8a7968584736251403f2e1d0c9b8a796858473625140a5c4b')
      setKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
      setIv('abcdef0123456789abcdef0123456789')
      setInputFormat('hex')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mono-label">🕵️ cipher detective</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          AES Mode Detector
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste some ciphertext and let&apos;s figure out how it was encrypted. Detective work, but with math.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Key className="w-5 h-5 text-[var(--candy-grape)]" />
              The Clues
            </CardTitle>
            <CardDescription>
              Hand over the ciphertext and key material, and we&apos;ll test them against every AES mode we know.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cipher Format</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={inputFormat === 'hex' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInputFormat('hex')}
                  >
                    Hex
                  </Button>
                  <Button
                    variant={inputFormat === 'base64' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInputFormat('base64')}
                  >
                    Base64
                  </Button>
                </div>
              </div>

              <div>
                <Label>Key Format</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={keyFormat === 'hex' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setKeyFormat('hex')}
                    className="px-3"
                  >
                    Hex
                  </Button>
                  <Button
                    variant={keyFormat === 'base64' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setKeyFormat('base64')}
                    className="px-3"
                  >
                    B64
                  </Button>
                  <Button
                    variant={keyFormat === 'utf8' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setKeyFormat('utf8')}
                    className="px-3"
                  >
                    Text
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="ciphertext">Ciphertext</Label>
              <textarea
                id="ciphertext"
                value={ciphertext}
                onChange={(e) => setCiphertext(e.target.value)}
                placeholder={inputFormat === 'hex' ? "hex-encoded ciphertext..." : "base64-encoded ciphertext..."}
                className="field-input w-full h-24 mt-2 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="key">Secret Key</Label>
              <Input
                id="key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={keyFormat === 'hex' ? "hex-encoded key..." : keyFormat === 'base64' ? "base64-encoded key..." : "utf-8 text key..."}
                className="mt-2 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="iv">
                IV (Initialization Vector)
                <span className="ml-2 text-xs text-muted-foreground">optional — required for CBC, CFB, OFB, CTR</span>
              </Label>
              <Input
                id="iv"
                type="text"
                value={iv}
                onChange={(e) => setIv(e.target.value)}
                placeholder={inputFormat === 'hex' ? "hex-encoded IV..." : "base64-encoded IV..."}
                className="mt-2 font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={detectAESMode}
                disabled={!ciphertext || !key || isDetecting}
                className="flex-1"
              >
                <Search className="w-4 h-4 mr-2" />
                {isDetecting ? "Investigating..." : "Crack the Case"}
              </Button>
              <Button
                onClick={generateExample}
                variant="outline"
              >
                Try an Example
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5 text-[var(--candy-sky)]" />
              The Case Files
            </CardTitle>
            <CardDescription>
              We&apos;ll try all 15 mode and key-size combinations for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="text-sm">Drop in a ciphertext and key, then let&apos;s start sleuthing.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-2xl border-2 border-[var(--ink)] transition-colors ${
                      result.success
                        ? 'bg-[#4cd4a9]/20'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-[var(--candy-mint)] mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 font-mono text-sm font-bold text-foreground">
                          {result.mode}
                          {result.success && (
                            <span className="chip border-2 border-[var(--ink)] bg-[#4cd4a9]/40 text-foreground">
                              🎉 case solved
                            </span>
                          )}
                        </div>
                        {result.success && result.decrypted && (
                          <div className="mt-2 p-2 rounded-xl border-2 border-[var(--ink)] bg-white">
                            <p className="text-xs font-bold text-muted-foreground mb-1">Decrypted message 📬</p>
                            <p className="text-sm font-mono text-foreground break-all">{result.decrypted}</p>
                          </div>
                        )}
                        {result.error && (
                          <p className="text-xs text-muted-foreground mt-1">🤷 {result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-surface mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Search className="w-5 h-5 text-[var(--candy-pink)]" />
            🔍 How the detective works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div>
              <h3 className="font-bold text-foreground mb-2">Modes we investigate</h3>
              <ul className="space-y-1 text-sm">
                <li><strong>ECB</strong> — Electronic Codebook (no IV)</li>
                <li><strong>CBC</strong> — Cipher Block Chaining (needs IV)</li>
                <li><strong>CFB</strong> — Cipher Feedback (needs IV)</li>
                <li><strong>OFB</strong> — Output Feedback (needs IV)</li>
                <li><strong>CTR</strong> — Counter (needs IV)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">Key sizes we try</h3>
              <ul className="space-y-1 text-sm">
                <li><strong>AES-128</strong> — 16 bytes</li>
                <li><strong>AES-192</strong> — 24 bytes</li>
                <li><strong>AES-256</strong> — 32 bytes</li>
              </ul>
              <p className="mt-3 text-sm">
                We attempt every combination and check whether the decrypted output looks like
                real, readable text. When it does, we&apos;ve likely found the mode and key size. Case closed!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}