"use client"

import {useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useAnimation } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LockIcon, KeyIcon, CodeIcon } from "lucide-react"

export default function HomePage() {
  const certContainerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()

  const certifications = [
    {
      name: "Offensive Security Web Expert",
      abbreviation: "OSWE",
      organization: "OffSec",
      image: "/oswe.svg",
      credentialId: "OS-AWAE-9939",
      issued: "Aug 2024",
    },
    {
      name: "GIAC Mobile Device Security Analyst",
      abbreviation: "GMOB",
      organization: "GIAC Certifications",
      image: "/gmob.png",
      issued: "Feb 2023",
      expires: "Feb 2027",
    },
    {
      name: "Certified APPSEC Practitioner",
      abbreviation: "CAP",
      organization: "The SecOps Group",
      image: "/cap.png",
      credentialId: "6903373",
      issued: "Jan 2023",
    },
    {
      name: "Certified Ethical Hacker Practical",
      abbreviation: "CEH Practical",
      organization: "EC-Council",
      image: "/cehp.svg",
      credentialId: "ECC6274013589",
      issued: "Jul 2022",
      expires: "Jul 2025",
    },
    {
      name: "Offensive Security Certified Professional",
      abbreviation: "OSCP",
      organization: "OffSec",
      image: "/oscp.svg",
      credentialId: "OS-101-52048",
      issued: "Oct 2021",
    },
    {
      name: "CREST Practitioner Security Analyst",
      abbreviation: "CPSA",
      organization: "CREST Approved",
      image: "/cpsa.png",
      credentialId: "7162294207",
      issued: "Sep 2021",
      expired: "Sep 2024",
    },
    {
      name: "CREST Registered Penetration Tester",
      abbreviation: "CRT",
      organization: "CREST Approved",
      image: "/crt.png",
      credentialId: "7162294207",
      issued: "Sep 2021",
      expired: "Sep 2024",
    }
  ]

  const tools = [
    { name: "Encryptor", path: "/encryptor", icon: LockIcon, status: "planned" },
    { name: "Password Generator", path: "/password-generator", icon: KeyIcon, status: "ready" },
    { name: "JSON Beautifier", path: "/json-beautifier", icon: CodeIcon, status: "in-development" }
  ]

  useEffect(() => {
    const container = certContainerRef.current
    if (!container) return

    const scrollWidth = container.scrollWidth
    const clientWidth = container.clientWidth
    const scrollDistance = scrollWidth - clientWidth

    const animateContainer = () => {
      container.style.transform = `translateX(-${scrollDistance}px)`
      container.style.transition = "transform 5s ease-in-out"

      setTimeout(() => {
        container.style.transform = "translateX(0)"
        container.style.transition = "transform 5s linear"

        // Recursive call for infinite looping
        setTimeout(animateContainer, 5000)
      }, 5000) // Wait for 5 seconds before resetting the position
    }

    animateContainer()

    const handleResize = () => {
      animateContainer()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <header className="flex items-center justify-between mb-12 sm:mb-16">
          <motion.div 
            className="flex items-center space-x-4 flex-grow"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Image 
              src="/profile.png" 
              alt="Andrew Salim" 
              width={100} 
              height={100} 
              className="rounded-full border-4 border-gray-200 dark:border-gray-700 shadow-lg"
            />
            <div className="flex-grow">
              <h1 className="text-3xl sm:text-4xl font-bold text-pink-600 dark:text-pink-400">Andrew Salim</h1>
              <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400">Veyal</p>
              <Link href="https://veyal.github.io" className="text-pink-600 dark:text-pink-400 hover:underline">
                veyal.github.io
              </Link>
            </div>
          </motion.div>
          <motion.div 
            className="flex-shrink-0 ml-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="https://www.linkedin.com/in/andrew-salim/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="bg-blue-600 text-white hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-800 whitespace-nowrap">
                LinkedIn
              </Button>
            </Link>
          </motion.div>
        </header>

        <motion.section 
          className="mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-center text-pink-600 dark:text-pink-400">My Certifications</h2>
          <div className="relative overflow-hidden">
            <motion.div
              ref={certContainerRef}
              className="flex space-x-4"
              animate={controls}
            >
              {certifications.map((cert, index) => (
                <motion.div
                  key={index}
                  className="flex-shrink-0 w-64 sm:w-72"
                >
                  <Card className="h-full bg-white dark:bg-gray-800 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl text-pink-600 dark:text-pink-400">
                        <abbr title={cert.name}>{cert.abbreviation}</abbr>
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base">{cert.organization}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-2">
                      <Image src={cert.image} alt={cert.name} width={100} height={50} className="rounded-md mb-2" />
                      <CardDescription className="text-xs sm:text-sm font-bold text-center">{cert.name}</CardDescription>
                      {cert.credentialId && (
                        <CardDescription className="text-xs sm:text-sm">Credential ID: {cert.credentialId}</CardDescription>
                      )}
                      <CardDescription className="text-xs sm:text-sm">Issued: {cert.issued}</CardDescription>
                      {cert.expires && (
                        <CardDescription className="text-xs sm:text-sm">Expires: {cert.expires}</CardDescription>
                      )}
                      {cert.expired && (
                        <CardDescription className="text-xs sm:text-sm">Expired: {cert.expired}</CardDescription>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-center text-pink-600 dark:text-pink-400">My Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {tools.map((tool, index) => (
              <motion.div
                key={index}
                whileHover={tool.status === "ready" ? { scale: 1.05 } : {}}
                whileTap={tool.status === "ready" ? { scale: 0.95 } : {}}
              >
                {tool.status === "ready" ? (
                  <Link href={tool.path}>
                    <Button 
                      variant="outline" 
                      className="w-full h-16 sm:h-20 text-lg sm:text-xl justify-start px-6 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md hover:shadow-lg"
                    >
                      <tool.icon className="w-6 h-6 sm:w-8 sm:h-8 mr-4 text-pink-600 dark:text-pink-400" />
                      {tool.name}
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="outline" 
                    className={`w-full h-16 sm:h-20 text-lg sm:text-xl justify-start px-6 bg-white dark:bg-gray-800 shadow-md cursor-not-allowed ${
                      tool.status === "in-development" ? "opacity-60" : "opacity-40"
                    }`}
                    disabled
                  >
                    <tool.icon className={`w-6 h-6 sm:w-8 sm:h-8 mr-4 ${
                      tool.status === "in-development" ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400 dark:text-gray-500"
                    }`} />
                    {tool.name}
                    <span className="ml-2 text-xs font-normal">
                      ({tool.status === "in-development" ? "In Development" : "Planned"})
                    </span>
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}