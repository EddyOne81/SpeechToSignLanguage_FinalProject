// package com.signlanguage.service;

// import java.io.IOException;
// import java.nio.file.Files;
// import java.nio.file.Path;
// import java.nio.file.Paths;
// import java.util.Optional;
// import java.util.UUID;

// import org.springframework.stereotype.Service;

// import com.signlanguage.entity.SignDictionary;
// import com.signlanguage.entity.TranslationHistory;
// import com.signlanguage.repository.SignDictionaryRepository;
// import com.signlanguage.repository.TranslationHistoryRepository;

// import lombok.*;
// import lombok.experimental.FieldDefaults;

// @Service
// @RequiredArgsConstructor
// @FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
// public class TranslationHistoryService {
//     SignDictionaryRepository signDictionaryRepository;
//     TranslationHistoryRepository translationHistoryRepository;


//     public String translateTextToPose(String englishText){
//         long startTime = System.currentTimeMillis();
        
//         Optional<SignDictionary> cachedWord = signDictionaryRepository.findByEnglishTextIgnoreCase(englishText);

//         if(cachedWord.isPresent()){
//             return cachedWord.get().getPoseFilePath();
//         }

//         byte[] poseData;

//         String fileName = UUID.randomUUID().toString() + ".pose";
//         String fileURL = saveFileToDisk(poseData, fileName);

//         saveHistory(englishText, null, fileURL, startTime);

//         return fileURL;
//     }

//     private String saveFileToDisk(byte[] data, String fileName) {
//         try {
//             Path dirPath = Paths.get(poseUploadDir);
//             if (!Files.exists(dirPath)) {
//                 Files.createDirectories(dirPath); // Tạo thư mục nếu chưa có
//             }
//             Path filePath = dirPath.resolve(fileName);
//             Files.write(filePath, data); // Ghi file
            
//             // Trả về URL để Frontend có thể tải (Ví dụ: /poses/uuid.pose)
//             return "/poses/" + fileName; 
//         } catch (IOException e) {
//             throw new RuntimeException("Không thể lưu file Pose: " + e.getMessage());
//         }
//     }

//     private void saveHistory(String text, SignDictionary dict, String aiPosePath, long startTime) {
//         TranslationHistory history = TranslationHistory.builder()
//                 .inputText(text)
//                 .word(dict)
//                 .poseFilePath(dict != null ? dict.getPoseFilePath() : aiPosePath)
//                 .processingTimeMs((int) (System.currentTimeMillis() - startTime))
//                 // .user(...) // Thêm user đang đăng nhập vào đây nếu có JWT Security
//                 .build();
//         translationHistoryRepository.save(history);
//     }
// }
