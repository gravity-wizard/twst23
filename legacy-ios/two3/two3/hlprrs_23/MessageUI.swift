//
//  MessageUI.swift
//  two3
//
//  Created by G on 1/10/20.
//  Copyright © 2020 akapps. All rights reserved.
//

import UIKit
import MessageUI
extension VC {
  func sendEmail(recipients: [String], message: String) {
    gui(recipients[0] + message)
    if MFMailComposeViewController.canSendMail() {
        let mail = MFMailComposeViewController()
      mail.mailComposeDelegate = self // as! MFMailComposeViewControllerDelegate
        mail.setToRecipients(recipients)
        mail.setMessageBody(message, isHTML: true)
        mail.setSubject(appInfoString())

        present(mail, animated: true)
    } else {
      gui("wrd")
    }
}

  public func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
    controller.dismiss(animated: true)
}
}
//Make sure you add import MessageUI to any Swift file that uses this code, and you’ll also need to conform to the MFMailComposeViewControllerDelegate protocol.
//
//Note that not all users have their device configure to send emails, which is why we need to check the result of canSendMail() before trying to send. Note also that you need to catch the didFinishWith callback in order to dismiss the mail window.
//
//Warning: this code frequently fails in the iOS Simulator. If you want to test it, try on a real device.
//
//LEARN SWIFTUI FOR FREE I have a massive, free SwiftUI video collection on YouTube teaching

