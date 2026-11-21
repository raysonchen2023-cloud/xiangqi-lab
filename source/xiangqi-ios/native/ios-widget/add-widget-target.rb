#!/usr/bin/env ruby
# 象棋千秋：在 Xcode 專案加「今日茶單」桌面小工具 target（XQTodayWidget），並替主 App 設 entitlements（Game Center＋App Group）。
#
# ★ 要付費 Apple Developer Program 帳號審核通過後才跑（App Group、Game Center 免費 Personal Team 不能用，跑了會簽不過）。
# ★ 一定要先備份 project.pbxproj（這支會檢查 24 小時內有沒有備份，沒有就不動）。
#
# 用法（iMac，在 xiangqi-ios 資料夾）：
#   cp ios/App/App.xcodeproj/project.pbxproj ios/App/App.xcodeproj/project.pbxproj.bak-$(date +%m%d-%H%M)
#   gem install xcodeproj --user-install          # 第一次才要（或 sudo gem install xcodeproj）
#   node scripts/install-native.js --gc-widget    # 先裝主 App 的兩支外掛、網址 xqqianqiu://
#   ruby native/ios-widget/add-widget-target.rb
#   node scripts/check-native.js
#
# 做的事（可以重複跑，已經有的不會重複加）：
#   1. 複製 native/ios-widget/ 的 XQTodayWidget.swift、Info.plist、XQTodayWidget.entitlements → ios/App/XQTodayWidget/
#   2. 複製 native/ios/App.entitlements → ios/App/App/App.entitlements，主 App 的 CODE_SIGN_ENTITLEMENTS 指過去
#   3. 新增 app extension target「XQTodayWidget」（bundle id com.raysonchen.xiangqiqianqiu.TodayWidget、iOS 15、Swift 5），
#      版本號跟主 App 一樣（App Store 要求），DEVELOPMENT_TEAM 跟主 App 一樣
#   4. 主 App 依賴它、加「Embed Foundation Extensions」把 .appex 放進 App 的 PlugIns
#
# 還原：cp 備份回 project.pbxproj，刪掉 ios/App/XQTodayWidget/ 和 ios/App/App/App.entitlements。
require 'fileutils'
begin
  require 'xcodeproj'
rescue LoadError
  abort '✘ 沒有 xcodeproj gem：先跑  gem install xcodeproj --user-install  （或 sudo gem install xcodeproj）'
end

ROOT = File.expand_path('../..', __dir__)
PROJ = File.join(ROOT, 'ios', 'App', 'App.xcodeproj')
PBX = File.join(PROJ, 'project.pbxproj')
SRC = File.join(ROOT, 'native', 'ios-widget')
APP_DIR = File.join(ROOT, 'ios', 'App', 'App')
TARGET = 'XQTodayWidget'
WDIR = File.join(ROOT, 'ios', 'App', TARGET)
APP_ID = 'com.raysonchen.xiangqiqianqiu'
WIDGET_ID = "#{APP_ID}.TodayWidget"

abort "✘ 找不到 #{PBX}" unless File.exist?(PBX)

baks = Dir.glob("#{PBX}.bak*").select { |f| File.mtime(f) > Time.now - 24 * 3600 }
if baks.empty?
  abort <<~MSG
    ✘ 請先備份 project.pbxproj（24 小時內的備份才算），這支才會動：
        cp ios/App/App.xcodeproj/project.pbxproj ios/App/App.xcodeproj/project.pbxproj.bak-$(date +%m%d-%H%M)
  MSG
end
puts "• 備份：#{File.basename(baks.max_by { |f| File.mtime(f) })}"

unless File.read(PBX).include?('XQGameCenterPlugin.swift')
  abort '✘ 主 App 還沒裝外掛：先跑  node scripts/install-native.js --gc-widget'
end

# 1、2. 複製檔案
FileUtils.mkdir_p(WDIR)
%w[XQTodayWidget.swift Info.plist XQTodayWidget.entitlements].each do |f|
  FileUtils.cp(File.join(SRC, f), File.join(WDIR, f))
end
FileUtils.cp(File.join(ROOT, 'native', 'ios', 'App.entitlements'), File.join(APP_DIR, 'App.entitlements'))
puts "• 複製小工具檔案到 ios/App/#{TARGET}/、App.entitlements 到 ios/App/App/"

project = Xcodeproj::Project.open(PROJ)
app = project.targets.find { |t| t.name == 'App' } or abort '✘ 找不到 App target'
first = app.build_configurations.first.build_settings
mv = first['MARKETING_VERSION'] || '1.0'
cv = first['CURRENT_PROJECT_VERSION'] || '1'
team = app.build_configurations.map { |c| c.build_settings['DEVELOPMENT_TEAM'] }.compact.first
puts '⚠ 主 App 還沒設 DEVELOPMENT_TEAM：等一下在 Xcode 兩個 target 都選同一個 Team' unless team

# 2. 主 App 的 entitlements
app_group = project.main_group['App'] or abort '✘ 找不到 App 群組'
app_group.new_reference('App.entitlements') unless app_group.files.any? { |x| x.path == 'App.entitlements' }
app.build_configurations.each { |c| c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements' }

# 3. 小工具 target
widget = project.targets.find { |t| t.name == TARGET }
if widget
  puts "• 已經有 #{TARGET} target，只更新設定"
else
  widget = project.new_target(:app_extension, TARGET, :ios, '15.0', nil, :swift)
  puts "• 新增 #{TARGET} target"
end
wgroup = project.main_group[TARGET] || project.main_group.new_group(TARGET, TARGET)
swift_ref = wgroup.files.find { |x| x.path == 'XQTodayWidget.swift' } || wgroup.new_reference('XQTodayWidget.swift')
%w[Info.plist XQTodayWidget.entitlements].each do |f|
  wgroup.new_reference(f) unless wgroup.files.any? { |x| x.path == f }
end
widget.source_build_phase.add_file_reference(swift_ref, true)

widget.build_configurations.each do |c|
  s = c.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = WIDGET_ID
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['INFOPLIST_FILE'] = "#{TARGET}/Info.plist"
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['CODE_SIGN_ENTITLEMENTS'] = "#{TARGET}/#{TARGET}.entitlements"
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['DEVELOPMENT_TEAM'] = team if team
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1,2'
  s['MARKETING_VERSION'] = mv
  s['CURRENT_PROJECT_VERSION'] = cv
  s['SKIP_INSTALL'] = 'YES'
  s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
end

# 4. 主 App 依賴小工具、把 .appex 放進 PlugIns
app.add_dependency(widget) unless app.dependencies.any? { |d| d.target == widget }
embed = app.copy_files_build_phases.find { |p| p.symbol_dst_subfolder_spec == :plug_ins }
embed ||= app.new_copy_files_build_phase('Embed Foundation Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
unless embed.files_references.include?(widget.product_reference)
  bf = embed.add_file_reference(widget.product_reference, true)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

attrs = (project.root_object.attributes['TargetAttributes'] ||= {})
attrs[widget.uuid] ||= { 'CreatedOnToolsVersion' => '16.0', 'ProvisioningStyle' => 'Automatic' }

project.save
puts '✔ 完成。下一步：'
puts '  1. Xcode 打開 ios/App/App.xcodeproj（關掉再開），App 和 XQTodayWidget 兩個 target 的 Signing & Capabilities 都選同一個付費 Team'
puts '  2. 兩個 target 的 App Groups 都勾 group.com.raysonchen.xiangqiqianqiu.shared；App 有 Game Center'
puts '  3. 選 App scheme → Run；桌面長按 → 編輯主畫面 → ＋ → 搜「象棋千秋」加小工具'
