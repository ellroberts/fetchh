console.log('🟢 TEST: Simple file executing');
window.SIMPLE_TEST = "working";
window.ThreadCubTagging = function() { 
  console.log('🟢 TEST: ThreadCubTagging called'); 
};
console.log('🟢 TEST: ThreadCubTagging defined as:', typeof window.ThreadCubTagging);