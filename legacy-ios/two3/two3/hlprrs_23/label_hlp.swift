//
//  label_hlp.swift
//  two4
//
//  Created by G on 11/16/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

extension UIView {
	func dexLabels(arr: [UILabel],
								 add: Bool = true) {
		let zck = add && z1i > zrv(.dbug)
		for (i,l) in arr .enumerated() {
			l.text = String(i)
			l.textColor = l.complementary(l.backgroundColor)
			if zck { addSubview(l) }
		}
	}
}
extension UILabel {
	/// Will auto resize the contained text to a font size which fits the frames bounds.
	/// Uses the pre-set font to dynamically determine the proper sizing
	func fitTextToBounds() {
		
		font = UIFont.monospacedDigitSystemFont(
			ofSize: UIFont.systemFontSize,
			weight: UIFont.Weight.regular)
		guard let text = text, let currentFont = font else { return }
		
		let bestFittingFont = UIFont.bestFittingFont(for: text, in: bounds, fontDescriptor: currentFont.fontDescriptor, additionalAttributes: basicStringAttributes)
		font = bestFittingFont
		fitHeight()
	}
	func fitHeight() {
		let wasFrame = frame
		sizeToFit()
		frame.size.width = wasFrame.width
	}
	
	private var basicStringAttributes: [NSAttributedString.Key: Any] {
		var attribs = [NSAttributedString.Key: Any]()
		
		let paragraphStyle = NSMutableParagraphStyle()
		paragraphStyle.alignment = self.textAlignment
		paragraphStyle.lineBreakMode = self.lineBreakMode
		attribs[.paragraphStyle] = paragraphStyle
		
		return attribs
	}
}
extension UIFont {
	/**
	Will return the best font conforming to the descriptor which will fit in the provided bounds.
	*/
	static func bestFittingFontSize(for text: String, in bounds: CGRect, fontDescriptor: UIFontDescriptor, additionalAttributes: [NSAttributedString.Key: Any]? = nil) -> CGFloat {
		let constrainingDimension = min(bounds.width, bounds.height)
		let properBounds = CGRect(origin: .zero, size: bounds.size)
		var attributes = additionalAttributes ?? [:]
		
		let infiniteBounds = CGSize(width: CGFloat.infinity, height: CGFloat.infinity)
		var bestFontSize: CGFloat = constrainingDimension
		
		for fontSize in stride(from: bestFontSize, through: 0, by: -1) {
			let newFont = UIFont(descriptor: fontDescriptor, size: fontSize)
			attributes[.font] = newFont
			
			let currentFrame = text.boundingRect(with: infiniteBounds, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes, context: nil)
			
			if properBounds.contains(currentFrame) {
				bestFontSize = fontSize
				break
			}
		}
		return bestFontSize
	}
	
	static func bestFittingFont(for text: String, in bounds: CGRect, fontDescriptor: UIFontDescriptor, additionalAttributes: [NSAttributedString.Key: Any]? = nil) -> UIFont {
		let bestSize = bestFittingFontSize(for: text, in: bounds, fontDescriptor: fontDescriptor, additionalAttributes: additionalAttributes)
		return UIFont(descriptor: fontDescriptor, size: bestSize)
	}
}

//let label = UILabel(frame: view.bounds)
//label.textAlignment = .center
//label.text = "Autosizing text"
//label.font = UIFont.systemFont(ofSize: 20, weight: 400) // Note: Font size will be overridden
//label.fitTextToBounds()
extension UILabel {
  
  override open func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    if #available(iOS 10.0, *) {
      if previousTraitCollection?.preferredContentSizeCategory != traitCollection.preferredContentSizeCategory {
        // content size has changed
      }
    } else {
      // Fallback on earlier versions
    }
  }
}
extension UILabel {
  func setSizeFont (sizeFont: CGFloat) {
    self.font =  UIFont(name: self.font.fontName, size: sizeFont)!
    self.sizeToFit()
  }
}

//Programmatically in Swift 5 with Xcode 10.2
//
//Building on top of @La masse's solution, but using autolayout to support rotation
//
//Set anchors for the view's position (left, top, centerY, centerX, etc). You can also set the width anchor or set the frame.width dynamically with the UIScreen extension provided (to support rotation)
//
//label = UILabel()
//label.numberOfLines = 0
//label.lineBreakMode = .byWordWrapping
//self.addSubview(label)
//// SET AUTOLAYOUT ANCHORS
//label.translatesAutoresizingMaskIntoConstraints = false
//label.leftAnchor.constraint(equalTo: self.leftAnchor, constant: 20).isActive = true
//label.rightAnchor.constraint(equalTo: self.rightAnchor, constant: -20).isActive = true
//label.topAnchor.constraint(equalTo: self.topAnchor, constant: 20).isActive = true
//// OPTIONALLY, YOU CAN USE THIS INSTEAD OF THE WIDTH ANCHOR (OR LEFT/RIGHT)
//// label.frame.size = CGSize(width: UIScreen.absoluteWidth() - 40.0, height: 0)
//label.text = "YOUR LONG TEXT GOES HERE"
//label.sizeToFit()
//If setting frame.width dynamically using UIScreen:

extension UIScreen {   // OPTIONAL IF USING A DYNAMIC FRAME WIDTH
    class func absoluteWidth() -> CGFloat {
        var width: CGFloat
        if UIScreen.main.bounds.width > UIScreen.main.bounds.height {
            width = self.main.bounds.height // Landscape
        } else {
            width = self.main.bounds.width // Portrait
        }
        return width
    }
}
extension Bool {
    static func rand_a() -> Bool {
        return arc4random_uniform(2) == 0
    }
}
// usage: Bool.random()
