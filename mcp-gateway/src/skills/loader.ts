/**
 * FORGE MCP Gateway - Skills Loader
 *
 * Parse SKILL.md files and load reference documents from skill libraries.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Skill,
  SkillReference,
  SkillScript,
  SkillMetadata,
  SkillCategory,
  RiskLevel,
  SKILL_CONFIGS,
} from './types.js';

// ============================================
// CONFIGURATION
// ============================================

const SKILLS_BASE_PATH = process.env.SKILLS_PATH || './skills';
const REFERENCE_DIRS = ['references', 'docs', 'prompts', 'templates'];
const SCRIPT_EXTENSIONS = ['.ts', '.js', '.py', '.sh'];
const SKILL_MD_FILENAME = 'SKILL.md';
const README_FILENAME = 'README.md';

// ============================================
// SKILL LOADER CLASS
// ============================================

export class SkillLoader {
  private basePath: string;
  private skillCache: Map<string, Skill> = new Map();

  constructor(basePath: string = SKILLS_BASE_PATH) {
    this.basePath = path.resolve(basePath);
  }

  /**
   * Load a single skill by name
   */
  async loadSkill(skillName: string): Promise<Skill | null> {
    // Check cache first
    if (this.skillCache.has(skillName)) {
      return this.skillCache.get(skillName)!;
    }

    const skillPath = path.join(this.basePath, skillName);

    // Check if skill directory exists
    if (!fs.existsSync(skillPath)) {
      // Return a skeleton skill from config if directory doesn't exist
      const config = SKILL_CONFIGS[skillName];
      if (config) {
        const skeletonSkill = this.createSkeletonSkill(skillName);
        this.skillCache.set(skillName, skeletonSkill);
        return skeletonSkill;
      }
      return null;
    }

    try {
      const skill = await this.parseSkillDirectory(skillName, skillPath);
      this.skillCache.set(skillName, skill);
      return skill;
    } catch (error) {
      console.error(`Error loading skill ${skillName}:`, error);
      return null;
    }
  }

  /**
   * Load all available skills
   */
  async loadAllSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];

    // Load from filesystem if available
    if (fs.existsSync(this.basePath)) {
      try {
        const entries = fs.readdirSync(this.basePath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skill = await this.loadSkill(entry.name);
            if (skill) {
              skills.push(skill);
            }
          }
        }
      } catch (error) {
        console.error('Error reading skills directory:', error);
      }
    }

    // Add skeleton skills for any configured but not loaded
    for (const skillName of Object.keys(SKILL_CONFIGS)) {
      if (!skills.find(s => s.name === skillName)) {
        const skeletonSkill = this.createSkeletonSkill(skillName);
        skills.push(skeletonSkill);
        this.skillCache.set(skillName, skeletonSkill);
      }
    }

    return skills;
  }

  /**
   * Get skill references
   */
  async getSkillReferences(skillName: string): Promise<SkillReference[]> {
    const skill = await this.loadSkill(skillName);
    return skill?.references || [];
  }

  /**
   * Clear the skill cache
   */
  clearCache(): void {
    this.skillCache.clear();
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Parse a skill directory
   */
  private async parseSkillDirectory(skillName: string, skillPath: string): Promise<Skill> {
    const config = SKILL_CONFIGS[skillName] || this.getDefaultConfig(skillName);

    // Parse SKILL.md or README.md for description
    const description = this.parseSkillDescription(skillPath) || config.description;

    // Load references
    const references = this.loadReferences(skillPath);

    // Load scripts
    const scripts = this.loadScripts(skillPath);

    // Parse metadata
    const metadata = this.parseMetadata(skillPath);

    return {
      name: skillName,
      displayName: config.displayName,
      description,
      category: config.category,
      references,
      scripts,
      metadata,
      riskLevel: config.riskLevel,
      useCases: config.useCases,
      relatedSkills: config.relatedSkills,
      loadedAt: new Date(),
    };
  }

  /**
   * Parse SKILL.md or README.md for description
   */
  private parseSkillDescription(skillPath: string): string | null {
    const skillMdPath = path.join(skillPath, SKILL_MD_FILENAME);
    const readmePath = path.join(skillPath, README_FILENAME);

    let mdPath: string | null = null;
    if (fs.existsSync(skillMdPath)) {
      mdPath = skillMdPath;
    } else if (fs.existsSync(readmePath)) {
      mdPath = readmePath;
    }

    if (!mdPath) return null;

    try {
      const content = fs.readFileSync(mdPath, 'utf-8');
      // Extract first paragraph after title
      const lines = content.split('\n');
      let foundTitle = false;
      let description = '';

      for (const line of lines) {
        if (line.startsWith('#') && !foundTitle) {
          foundTitle = true;
          continue;
        }
        if (foundTitle && line.trim() && !line.startsWith('#')) {
          description += line.trim() + ' ';
        }
        if (foundTitle && line.startsWith('#')) {
          break;
        }
      }

      return description.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Load reference documents from skill directory
   */
  private loadReferences(skillPath: string): SkillReference[] {
    const references: SkillReference[] = [];

    for (const refDir of REFERENCE_DIRS) {
      const refPath = path.join(skillPath, refDir);
      if (!fs.existsSync(refPath)) continue;

      try {
        const files = this.walkDirectory(refPath);
        for (const file of files) {
          if (this.isReferenceFile(file)) {
            try {
              const content = fs.readFileSync(file, 'utf-8');
              const stats = fs.statSync(file);
              references.push({
                filename: path.basename(file),
                path: path.relative(skillPath, file),
                content,
                category: refDir,
                size: stats.size,
                lastModified: stats.mtime,
              });
            } catch {
              // Skip unreadable files
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    // Also check root for markdown files
    try {
      const rootFiles = fs.readdirSync(skillPath);
      for (const file of rootFiles) {
        const filePath = path.join(skillPath, file);
        if (this.isReferenceFile(filePath) && fs.statSync(filePath).isFile()) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const stats = fs.statSync(filePath);
            references.push({
              filename: file,
              path: file,
              content,
              category: 'root',
              size: stats.size,
              lastModified: stats.mtime,
            });
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Skip if can't read root
    }

    return references;
  }

  /**
   * Load scripts from skill directory
   */
  private loadScripts(skillPath: string): SkillScript[] {
    const scripts: SkillScript[] = [];
    const scriptDirs = ['scripts', 'src', 'lib', '.'];

    for (const dir of scriptDirs) {
      const dirPath = path.join(skillPath, dir);
      if (!fs.existsSync(dirPath)) continue;

      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const ext = path.extname(file);
          if (SCRIPT_EXTENSIONS.includes(ext)) {
            scripts.push({
              name: path.basename(file, ext),
              path: path.join(dir, file),
              description: `${ext.slice(1).toUpperCase()} script`,
            });
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    return scripts;
  }

  /**
   * Parse metadata from package.json or skill config
   */
  private parseMetadata(skillPath: string): SkillMetadata {
    const packagePath = path.join(skillPath, 'package.json');
    const metadata: SkillMetadata = {};

    if (fs.existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        metadata.version = pkg.version;
        metadata.author = pkg.author;
        metadata.license = pkg.license;
        metadata.repository = pkg.repository?.url || pkg.repository;
        metadata.tags = pkg.keywords;
        metadata.dependencies = Object.keys(pkg.dependencies || {});
      } catch {
        // Skip invalid package.json
      }
    }

    return metadata;
  }

  /**
   * Create skeleton skill from config
   */
  private createSkeletonSkill(skillName: string): Skill {
    const config = SKILL_CONFIGS[skillName] || this.getDefaultConfig(skillName);

    return {
      name: skillName,
      displayName: config.displayName,
      description: config.description,
      category: config.category,
      references: [],
      scripts: [],
      metadata: {},
      riskLevel: config.riskLevel,
      useCases: config.useCases,
      relatedSkills: config.relatedSkills,
      loadedAt: new Date(),
    };
  }

  /**
   * Get default config for unknown skill
   */
  private getDefaultConfig(skillName: string) {
    return {
      displayName: skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: `${skillName} skill library`,
      category: SkillCategory.DEVELOPMENT,
      riskLevel: RiskLevel.L3_MEDIUM,
      useCases: [],
      relatedSkills: [],
      keywords: [],
    };
  }

  /**
   * Check if file is a reference document
   */
  private isReferenceFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.md', '.txt', '.json', '.yaml', '.yml', '.xml'].includes(ext);
  }

  /**
   * Walk directory recursively
   */
  private walkDirectory(dir: string): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.walkDirectory(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}

// Singleton instance
export const skillLoader = new SkillLoader();
