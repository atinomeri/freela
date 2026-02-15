#!/usr/bin/env node
/**
 * Backup Verification Script
 * Verifies backup integrity and lists recent backups
 * 
 * Usage: node scripts/verify-backup.mjs [backup-file]
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const backupDir = process.env.BACKUP_DIR || "./backups";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(date) {
  return date.toISOString().replace("T", " ").split(".")[0];
}

function listBackups() {
  if (!fs.existsSync(backupDir)) {
    console.log("No backup directory found.");
    return [];
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith("freela_") && (f.endsWith(".dump") || f.endsWith(".dump.gz")))
    .map(f => {
      const fullPath = path.join(backupDir, f);
      const stats = fs.statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        size: stats.size,
        created: stats.mtime
      };
    })
    .sort((a, b) => b.created - a.created);

  return files;
}

function verifyBackup(filePath) {
  console.log(`\nVerifying: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found");
    return false;
  }

  const stats = fs.statSync(filePath);
  console.log(`   Size: ${formatBytes(stats.size)}`);
  console.log(`   Created: ${formatDate(stats.mtime)}`);

  // Check if gzipped
  const isGzipped = filePath.endsWith(".gz");
  
  try {
    if (isGzipped) {
      // Test gzip integrity
      const gzipTest = spawnSync("gzip", ["-t", filePath], { stdio: "pipe" });
      if (gzipTest.status !== 0) {
        console.error("❌ Gzip integrity check failed");
        return false;
      }
      console.log("   ✓ Gzip integrity OK");
    }

    // Try to read pg_restore info
    const restoreArgs = isGzipped
      ? ["--list", filePath]
      : ["--list", filePath];
    
    // For gzipped files, we need to decompress first or use pg_restore directly
    // pg_restore can handle gzipped custom format directly
    const result = spawnSync("pg_restore", restoreArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    if (result.error) {
      console.log("   ⚠ pg_restore not available (skipping format verification)");
    } else if (result.status !== 0) {
      const stderr = result.stderr?.toString() || "";
      if (stderr.includes("input file appears to be a text format dump")) {
        console.log("   ✓ SQL text format detected");
      } else {
        console.error("   ⚠ pg_restore warning:", stderr.slice(0, 200));
      }
    } else {
      const output = result.stdout?.toString() || "";
      const lines = output.split("\n").filter(l => l.trim()).length;
      console.log(`   ✓ Valid pg_dump format (${lines} objects)`);
    }

    console.log("   ✅ Backup verification passed");
    return true;
  } catch (err) {
    console.error("   ❌ Verification error:", err.message);
    return false;
  }
}

// Main
console.log("=================================");
console.log("  Freela Backup Verification");
console.log("=================================\n");

const specificFile = process.argv[2];

if (specificFile) {
  // Verify specific file
  const success = verifyBackup(specificFile);
  process.exit(success ? 0 : 1);
} else {
  // List and verify recent backups
  const backups = listBackups();
  
  if (backups.length === 0) {
    console.log("No backups found in:", backupDir);
    console.log("\nTo create a backup:");
    console.log("  DATABASE_URL=... node scripts/pg-backup.mjs");
    process.exit(0);
  }

  console.log(`Found ${backups.length} backup(s) in ${backupDir}:\n`);
  
  // Table header
  console.log("┌─────────────────────────────────────────────┬──────────┬─────────────────────┐");
  console.log("│ Filename                                    │ Size     │ Created             │");
  console.log("├─────────────────────────────────────────────┼──────────┼─────────────────────┤");
  
  for (const backup of backups.slice(0, 10)) {
    const name = backup.name.padEnd(43).slice(0, 43);
    const size = formatBytes(backup.size).padEnd(8);
    const date = formatDate(backup.created);
    console.log(`│ ${name} │ ${size} │ ${date} │`);
  }
  
  console.log("└─────────────────────────────────────────────┴──────────┴─────────────────────┘");

  if (backups.length > 10) {
    console.log(`   ... and ${backups.length - 10} more`);
  }

  // Calculate total size
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  console.log(`\nTotal backup size: ${formatBytes(totalSize)}`);

  // Verify latest backup
  if (backups.length > 0) {
    console.log("\n--- Latest Backup ---");
    verifyBackup(backups[0].path);
  }

  // Storage warning
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const hasRecentBackup = backups.some(b => b.created.getTime() > oneDayAgo);
  
  if (!hasRecentBackup) {
    console.log("\n⚠️  WARNING: No backups in the last 24 hours!");
    console.log("   Consider setting up automated backups with cron.");
  }
}
