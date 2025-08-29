"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, XCircle, Shield, Key, Search } from "lucide-react"
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
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="kirby-title mb-4">
            <Shield className="inline-block w-12 h-12 mr-4 text-pink-500" />
            AES Mode Detector
          </h1>
          <p className="kirby-subtitle">Identify AES encryption mode from ciphertext and key</p>
          <div className="mt-4">
            <span className="game-badge">Educational Tool</span>
            <span className="game-badge ml-2">Cryptography PoC</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="kirby-card">
            <CardHeader>
              <CardTitle className="text-pink-600 dark:text-pink-400">
                <Key className="inline-block w-5 h-5 mr-2" />
                Input Parameters
              </CardTitle>
              <CardDescription>
                Enter ciphertext and key to detect AES mode
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
                      className="kirby-button"
                    >
                      Hex
                    </Button>
                    <Button
                      variant={inputFormat === 'base64' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInputFormat('base64')}
                      className="kirby-button"
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
                      className="kirby-button px-3"
                    >
                      Hex
                    </Button>
                    <Button
                      variant={keyFormat === 'base64' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setKeyFormat('base64')}
                      className="kirby-button px-3"
                    >
                      B64
                    </Button>
                    <Button
                      variant={keyFormat === 'utf8' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setKeyFormat('utf8')}
                      className="kirby-button px-3"
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
                  placeholder={inputFormat === 'hex' ? "Enter hex encoded ciphertext..." : "Enter base64 encoded ciphertext..."}
                  className="w-full h-24 p-3 mt-2 rounded-2xl border-2 border-pink-300 dark:border-pink-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="key">Secret Key</Label>
                <Input
                  id="key"
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={keyFormat === 'hex' ? "Enter hex encoded key..." : keyFormat === 'base64' ? "Enter base64 encoded key..." : "Enter text/UTF-8 key..."}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="iv">
                  IV (Initialization Vector) - Optional
                  <span className="text-xs text-gray-500 ml-2">Required for CBC, CFB, OFB, CTR modes</span>
                </Label>
                <Input
                  id="iv"
                  type="text"
                  value={iv}
                  onChange={(e) => setIv(e.target.value)}
                  placeholder={inputFormat === 'hex' ? "Enter hex encoded IV (if available)..." : "Enter base64 encoded IV..."}
                  className="font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={detectAESMode}
                  disabled={!ciphertext || !key || isDetecting}
                  className="kirby-button flex-1"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isDetecting ? "Detecting..." : "Detect Mode"}
                </Button>
                <Button
                  onClick={generateExample}
                  variant="outline"
                  className="kirby-button"
                >
                  Generate Example
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="kirby-card">
            <CardHeader>
              <CardTitle className="text-pink-600 dark:text-pink-400">
                <Shield className="inline-block w-5 h-5 mr-2" />
                Detection Results
              </CardTitle>
              <CardDescription>
                Testing against common AES modes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Enter ciphertext and key to start detection</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        result.success
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400 mt-1" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-sm">
                            {result.mode}
                            {result.success && (
                              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                MATCH!
                              </span>
                            )}
                          </div>
                          {result.success && result.decrypted && (
                            <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Decrypted text:</p>
                              <p className="text-sm font-mono break-all">{result.decrypted}</p>
                            </div>
                          )}
                          {result.error && (
                            <p className="text-xs text-gray-500 mt-1">{result.error}</p>
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

        <Card className="kirby-card mt-6">
          <CardHeader>
            <CardTitle className="text-purple-600 dark:text-purple-400">
              <AlertCircle className="inline-block w-5 h-5 mr-2" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2 text-pink-600">Supported AES Modes:</h3>
                <ul className="space-y-1">
                  <li>• ECB (Electronic Codebook) - No IV needed</li>
                  <li>• CBC (Cipher Block Chaining) - Requires IV</li>
                  <li>• CFB (Cipher Feedback) - Requires IV</li>
                  <li>• OFB (Output Feedback) - Requires IV</li>
                  <li>• CTR (Counter) - Requires IV</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-purple-600">Key Sizes Tested:</h3>
                <ul className="space-y-1">
                  <li>• AES-128 (16 bytes)</li>
                  <li>• AES-192 (24 bytes)</li>
                  <li>• AES-256 (32 bytes)</li>
                </ul>
                <p className="mt-2 text-xs text-gray-600">
                  The tool attempts decryption with each combination and checks if the result is readable text.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}