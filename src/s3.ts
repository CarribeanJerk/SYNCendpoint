import AWS from 'aws-sdk';
import fs from 'fs';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});

const BUCKET_NAME = 'syncbucketai';  // Your existing bucket

export async function uploadToS3(filePath: string, key: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: 'video/mp4',
    ACL: 'public-read'
  };

  try {
    const uploadResult = await s3.upload(params).promise();
    console.log(`✅ File uploaded to S3: ${uploadResult.Location}`);
    return uploadResult.Location;
  } catch (error) {
    console.error('❌ Error uploading file to S3:', error);
    throw error;
  }
} 