# Socket Event Contract Inventory

## Client → Server (principal events)
- `setUserContext`
- `getFilters`
- `askGemini`, `parseImageWithGemini`
- `createNamedClass`, `createClass`, `getTeacherClass`, `joinClass`
- `addNewQuestion`, `getTeacherLibrary`, `getClassQuestions`
- `addStudentQuestion`, `getStudentLibrary`, `updateReviewDate`, `deleteStudentQuestion`
- `saveStudentResult`, `getMyStats`, `getTeacherReports`
- `saveClassMistakes`, `getClassMistakes`, `addToReviewQueue`, `getEvaluationData`
- `sendGlobalAlert`
- `getPendingTeachers`, `approveTeacher`
- `reportQuestion`, `adminGetReports`
- `createRoom`, `joinRoom`, `startTrial`, `startGame`, `submitAnswer`

## Server → Client (principal events)
- `updateFilters`
- `geminiResponse`, `geminiParsedData`
- `errorMsg`
- `teacherClassesData`, `classCreated`, `teacherClassFound`, `classJoined`
- `teacherLibraryData`, `classQuestionsData`
- `studentLibraryData`, `notebookReviewsCount`
- `myStatsData`, `teacherReportsData`, `classMistakesData`, `evaluationData`
- `pendingTeachersData`
- `receiveGlobalAlert`
- `allReportsData`
- `roomCreated`, `roomJoined`, `updatePlayerList`
- `trialStarted`, `newQuestion`, `answerResult`, `gameOver`

## Drift fixes included in this iteration
- Added missing backend handlers: `createClass`, `saveClassMistakes`, `getClassMistakes`, `addToReviewQueue`, `getEvaluationData`
- Added frontend handling for: `errorMsg`, `evaluationData`
- Normalized `teacherReportsData` payload shape to `{ reports, roster }`
- Added backward-compatibility emit: `teacherClassFound`
