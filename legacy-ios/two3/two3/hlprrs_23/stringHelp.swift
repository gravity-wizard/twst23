//
//  stringHelp.swift
//  two4
//
//  Created by G on 10/21/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
public extension String {
  func indexInt1st(of char: Character) -> Int? {
    return firstIndex(of: char)?.utf16Offset(in: self)
  }
  func indexIntLast(of char: Character) -> Int? {
    return lastIndex(of: char)?.utf16Offset(in: self)
  }
}

//A simple drop in extension that will provide a variable via an extension of Int.
//As noted in Julien's answer, this makes use of a static formatter for performance reasons.
// https://stackoverflow.com/questions/31021197/how-to-add-commas-to-a-number-in-swift/45970799
extension Int {
    private static var numberFormatter: NumberFormatter = {
        let numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = .decimal

        return numberFormatter
    }()
    var delimiter: String {
        return Int.numberFormatter.string(from: NSNumber(value: self)) ?? ""
    }
}
//To use it:
//let number = 31908551587
//print(number.delimiter) // 31,908,551,587
