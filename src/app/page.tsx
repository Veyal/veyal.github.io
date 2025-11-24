"use client"

import { HeroSection } from "@/components/HeroSection"
import { CharacterCard } from "@/components/CharacterCard"
import { StageSelect } from "@/components/StageSelect"
import { AchievementGallery } from "@/components/AchievementGallery"

export default function HomePage() {
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 sm:py-12 relative z-10">
        <HeroSection />
        <CharacterCard />
        <StageSelect />
        <AchievementGallery />
      </div>
    </div>
  )
}