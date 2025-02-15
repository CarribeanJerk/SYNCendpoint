import fs from 'fs';
import path from 'path';

function clearOutputFolders() {
  const outputDir = path.join(__dirname, '../output');
  
  // Get all folders within output
  const folders = fs.readdirSync(outputDir);
  
  folders.forEach(folder => {
    const folderPath = path.join(outputDir, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      // Clear all files in the folder
      fs.readdirSync(folderPath).forEach(file => {
        const filePath = path.join(folderPath, file);
        fs.unlinkSync(filePath);
      });
      console.log(`✅ Cleared ${folder} folder`);
    }
  });
  
  console.log('✅ All output folders cleared');
}

clearOutputFolders(); 