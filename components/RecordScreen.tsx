// "use client";

// import Image from "next/image";
// import { useRouter } from "next/navigation";
// import { useRef, useState } from "react";
// import { usePiPRecording } from "@/lib/hooks/usePiPRecording";
// import { ICONS } from "@/constants";

// const RecordScreen = () => {
//   // const router = useRouter();
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const [isOpen, setIsOpen] = useState(false);

//   // Use the new Picture-in-Picture recording hook
//   const {
//     isRecording,
//     // recordedBlob,
//     recordedVideoUrl,
//     recordingDuration,
//     startRecording,
//     stopRecording,
//     resetRecording,
//   } = usePiPRecording();

//   const closeModal = () => {
//     resetRecording();
//     setIsOpen(false);
//   };

//   const handleStart = async () => {
//     await startRecording();
//   };

//   const recordAgain = async () => {
//     resetRecording();
//     await startRecording();
//     if (recordedVideoUrl && videoRef.current) {
//       videoRef.current.src = recordedVideoUrl;
//     }
//   };

//   // const goToUpload = () => {
//   //   if (!recordedBlob) return;
//   //   const url = URL.createObjectURL(recordedBlob);
//   //   sessionStorage.setItem(
//   //     "recordedVideo",
//   //     JSON.stringify({
//   //       url,
//   //       name: "screen-recording.webm",
//   //       type: recordedBlob.type,
//   //       size: recordedBlob.size,
//   //       duration: recordingDuration || 0,
//   //     })
//   //   );
//   //   router.push("/upload");
//   //   closeModal();
//   // };

//   return (
//     <div className="record">
//       <button
//         onClick={() => setIsOpen(true)}
//         className="primary-btn group relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]"
//       >
//         <div className="relative">
//           <div className="absolute inset-0 animate-ping bg-red-400 rounded-full opacity-75" />
//           <Image
//             src={ICONS.record}
//             alt="record"
//             width={20}
//             height={20}
//             className="relative"
//           />
//         </div>
//         <span className="font-semibold truncate">Record Screen</span>
//         <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-300" />
//       </button>

//       {isOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-all duration-300"
//             onClick={closeModal}
//           />

//           <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100">
//             {/* Header */}
//             <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-red-500/10 rounded-lg">
//                   <Image
//                     src={ICONS.record}
//                     alt="record"
//                     width={24}
//                     height={24}
//                     className="text-red-400"
//                   />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-bold text-white">
//                     Screen Recording
//                   </h3>
//                   <p className="text-sm text-gray-400">
//                     Record your screen activity with webcam PiP
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={closeModal}
//                 className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200"
//                 aria-label="Close"
//               >
//                 <Image src={ICONS.close} alt="Close" width={24} height={24} />
//               </button>
//             </div>

//             {/* Recording Preview/Status Area */}
//             <div className="p-8">
//               <div className="min-h-[300px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700/50 bg-gradient-to-b from-gray-900/50 to-gray-800/30">
//                 {isRecording ? (
//                   <div className="flex flex-col items-center gap-4">
//                     <div className="relative">
//                       <div className="w-20 h-20 bg-red-500 rounded-full animate-pulse" />
//                       <div className="absolute inset-0 flex items-center justify-center">
//                         <div className="w-8 h-8 bg-white rounded-sm" />
//                       </div>
//                     </div>
//                     <div className="text-center">
//                       <div className="flex items-center gap-2 text-red-400 font-semibold text-lg">
//                         <span className="relative flex h-3 w-3">
//                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
//                           <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
//                         </span>
//                         Recording with PiP...
//                       </div>
//                       <p className="text-gray-400 mt-2">
//                         Duration:{" "}
//                         <span className="font-mono text-white">
//                           {Math.floor((recordingDuration || 0) / 60)}:
//                           {((recordingDuration || 0) % 60)
//                             .toString()
//                             .padStart(2, "0")}
//                         </span>
//                       </p>
//                     </div>
//                   </div>
//                 ) : recordedVideoUrl ? (
//                   <div className="w-full max-w-lg">
//                     <video
//                       ref={videoRef}
//                       src={recordedVideoUrl}
//                       controls
//                       className="w-full rounded-lg shadow-lg"
//                       poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%231f2937'/%3E%3Cpath d='M150,100 L250,100 L200,150 Z' fill='%234b5563'/%3E%3C/svg%3E"
//                     />
//                     <div className="mt-4 text-center text-gray-400 text-sm">
//                       Review your recording before uploading
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="text-center p-8">
//                     <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700/50">
//                       <Image
//                         src={ICONS.record}
//                         alt="record"
//                         width={40}
//                         height={40}
//                         className="opacity-60"
//                       />
//                     </div>
//                     <h4 className="text-xl font-semibold text-white mb-2">
//                       Ready to Record
//                     </h4>
//                     <p className="text-gray-400 max-w-md">
//                       Click start to select your screen and enable webcam.
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Action Buttons */}
//             <div className="p-6 border-t border-gray-700/50 bg-gradient-to-t from-gray-900/80 to-transparent">
//               <div className="flex flex-col sm:flex-row gap-4 justify-center">
//                 {!isRecording && !recordedVideoUrl && (
//                   <button
//                     onClick={handleStart}
//                     className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] font-semibold min-w-[200px]"
//                   >
//                     <div className="relative">
//                       <div className="absolute inset-0 animate-ping bg-red-400 rounded-full opacity-75" />
//                       <Image
//                         src={ICONS.record}
//                         alt="record"
//                         width={20}
//                         height={20}
//                         className="relative"
//                       />
//                     </div>
//                     Start Recording
//                   </button>
//                 )}

//                 {isRecording && (
//                   <button
//                     onClick={stopRecording}
//                     className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl border-2 border-red-500/30 hover:border-red-500/50 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] font-semibold min-w-[200px]"
//                   >
//                     <div className="w-4 h-4 bg-red-500 rounded-sm" />
//                     Stop Recording
//                   </button>
//                 )}

//                 {recordedVideoUrl && (
//                   <>
//                     <button
//                       onClick={recordAgain}
//                       className="px-8 py-4 bg-linear
//                       -to-r from-gray-800 to-gray-900 text-white rounded-xl border-2 border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] font-semibold"
//                     >
//                       Record Again
//                     </button>
//                     {/* <button
//                       onClick={goToUpload}
//                       className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] font-semibold"
//                     >
//                       <Image
//                         src={ICONS.upload}
//                         alt="Upload"
//                         width={20}
//                         height={20}
//                       />
//                       Continue to Upload
//                     </button> */}
//                   </>
//                 )}
//               </div>

//               {recordedVideoUrl && (
//                 <div className="mt-4 text-center">
//                   <button
//                     onClick={closeModal}
//                     className="text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RecordScreen;
