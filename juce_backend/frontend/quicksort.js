/**
 * Quicksort implementation in JavaScript
 * 
 * This function implements the quicksort algorithm, an efficient divide-and-conquer
 * sorting algorithm with average-case time complexity of O(n log n).
 * 
 * @param {Array} arr - The array to be sorted
 * @param {number} left - The starting index of the subarray (optional)
 * @param {number} right - The ending index of the subarray (optional)
 * @returns {Array} The sorted array
 */
function quickSort(arr, left = 0, right = arr.length - 1) {
  // Base case: if the subarray has 0 or 1 elements, it's already sorted
  if (left < right) {
    // Partition the array and get the pivot index
    const pivotIndex = partition(arr, left, right);
    
    // Recursively sort the left subarray (elements less than pivot)
    quickSort(arr, left, pivotIndex - 1);
    
    // Recursively sort the right subarray (elements greater than pivot)
    quickSort(arr, pivotIndex + 1, right);
  }
  
  return arr;
}

/**
 * Helper function to partition the array
 * 
 * @param {Array} arr - The array to partition
 * @param {number} left - The starting index
 * @param {number} right - The ending index
 * @returns {number} The index of the pivot element after partitioning
 */
function partition(arr, left, right) {
  // Choose the rightmost element as pivot
  const pivot = arr[right];
  
  // Index of the smaller element
  let i = left - 1;
  
  // Traverse through the array from left to right
  for (let j = left; j < right; j++) {
    // If current element is smaller than or equal to pivot
    if (arr[j] <= pivot) {
      i++;
      
      // Swap arr[i] and arr[j]
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  // Swap arr[i+1] and arr[right] (pivot)
  // Place pivot in its correct position
  [arr[i + 1], arr[right]] = [arr[right], arr[i + 1]];
  
  // Return the partition index
  return i + 1;
}

/**
 * QuickSort using a functional approach (creates new arrays)
 * 
 * @param {Array} arr - The array to be sorted
 * @returns {Array} A new sorted array
 */
function quickSortFunctional(arr) {
  // Base case: arrays with 0 or 1 element are already sorted
  if (arr.length <= 1) {
    return arr;
  }
  
  // Choose the first element as pivot
  const pivot = arr[0];
  
  // Partition the array: elements less than pivot, elements equal to pivot, elements greater than pivot
  const less = [];
  const equal = [];
  const greater = [];
  
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < pivot) {
      less.push(arr[i]);
    } else if (arr[i] > pivot) {
      greater.push(arr[i]);
    } else {
      equal.push(arr[i]);
    }
  }
  
  // Recursively sort less and greater arrays, then combine
  return [...quickSortFunctional(less), ...equal, ...quickSortFunctional(greater)];
}

// Export the functions for use in Node.js or other environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { quickSort, quickSortFunctional };
}

// Example usage:
console.log('In-place QuickSort:');
console.log(quickSort([64, 34, 25, 12, 22, 11, 90])); // [11, 12, 22, 25, 34, 64, 90]
console.log(quickSort([5, 1, 4, 2, 8])); // [1, 2, 4, 5, 8]

console.log('\nFunctional QuickSort:');
console.log(quickSortFunctional([64, 34, 25, 12, 22, 11, 90])); // [11, 12, 22, 25, 34, 64, 90]
console.log(quickSortFunctional([5, 1, 4, 2, 8])); // [1, 2, 4, 5, 8]
