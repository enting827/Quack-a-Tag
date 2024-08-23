//  time-driven trigger will be specific to each user's account.
function createTimeDrivenTrigger() {
  ScriptApp.newTrigger('checkFilesInDrive')
    .timeBased()
    .everyMonths(1) // Set the trigger to run every month
    .create();
}

function checkFilesInDrive() {
  const firebaseUrl = `${FIREBASE_URL}/${hash(email)}/fileTags.json?auth=${FIREBASE_SECRET}`;
  
  try {
    const response = UrlFetchApp.fetch(firebaseUrl, {
      method: 'GET',
      contentType: 'application/json'
    });

    const fileTagsData = JSON.parse(response.getContentText());
    const fileIds = Object.keys(fileTagsData);

    const deletedFileIds = [];

    fileIds.forEach(fileId => {
      try {
        const file = DriveApp.getFileById(fileId);
        if (!file) {
          deletedFileIds.push(fileId);
        }
      } catch (e) {
        // If the file doesn't exist (or has been deleted), the DriveApp.getFileById() will throw an exception
        deletedFileIds.push(fileId);
      }
    });

console.log(deletedFileIds)
    if (deletedFileIds.length > 0) {
      removeFromTags(deletedFileIds)
      removeFromFileTags(deletedFileIds);
    }

  } catch (e) {
    Logger.log('Error fetching file IDs from Firebase: ' + e.toString());
  }
}

function removeFromFileTags(deletedFileIds){
  const firebaseUrl = `${FIREBASE_URL}/${hash(email)}/fileTags.json?auth=${FIREBASE_SECRET}`;  

  try {
    const updates = {};
    deletedFileIds.forEach(fileId => {
      updates[`/${fileId}`] = null;
    });

    const options = {
      method: 'PATCH',
      contentType: 'application/json',
      payload: JSON.stringify(updates)
    };

    UrlFetchApp.fetch(firebaseUrl, options);
    Logger.log('Deleted files removed from Firebase for user: ' + email);

  } catch (e) {
    Logger.log('Error removing deleted files from Firebase: ' + e.toString());
  }
}

function removeFromTags(deletedFileIds) {
  const tagsUrl = `${FIREBASE_URL}/${hash(email)}/tags.json?auth=${FIREBASE_SECRET}`;
  
  try {
    const response = UrlFetchApp.fetch(tagsUrl, {
      method: 'GET',
      contentType: 'application/json'
    });

    const tagsData = JSON.parse(response.getContentText());
    const updates = {};

    for (const [tagId, tagData] of Object.entries(tagsData)) {
      if (tagData.fileIds) {
        const updatedFileIds = tagData.fileIds.filter(fileId => !deletedFileIds.includes(fileId));

        if (updatedFileIds.length > 0) {
          // If there are still fileIds left, update the tag
          updates[`/${tagId}/fileIds`] = updatedFileIds;
        } else {
          // If no fileIds are left, remove the tag
          updates[`/${tagId}`] = null;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const options = {
        method: 'PATCH',
        contentType: 'application/json',
        payload: JSON.stringify(updates)
      };

      UrlFetchApp.fetch(tagsUrl, options);
      Logger.log('Deleted file IDs removed from tags subcollection for user: ' + email);
    }

  } catch (e) {
    Logger.log('Error updating tags subcollection: ' + e.toString());
  }
}
