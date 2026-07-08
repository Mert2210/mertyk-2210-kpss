import sys

index_path = "index.js"
with open(index_path, "r", encoding="utf-8") as f:
    js = f.read()

# Find the block we need to remove
bad_block = """              try {
                  await admin.messaging().send({
                      token: safeToken,
                      notification: {
                          title: "🔔 Bildirimler Aktif!",
                          body: "Harika! Bildirim sisteminiz başarıyla kuruldu."
                      }
                  });
              } catch (testErr) {
                  console.log("Test bildirimi gönderilemedi (genelde sorun olmaz):", testErr.message);
              }"""

bad_block2 = """              try {
                  await admin.messaging().send({
                      token: safeToken,
                      notification: {
                          title: "🔔 Bildirimler Aktif!",
                          body: "Harika! Bildirim sisteminiz başarıyla kuruldu."
                      }
                  });
              } catch(testErr) {
                  console.log("Test bildirimi gönderilemedi (genelde sorun olmaz):", testErr.message);
              }"""

if bad_block in js:
    js = js.replace(bad_block, "")
elif bad_block2 in js:
    js = js.replace(bad_block2, "")
else:
    # Use regex or simple string find if spacing differs
    import re
    js = re.sub(r'try\s*\{\s*await admin\.messaging\(\)\.send\(\{.*?Harika! Bildirim sisteminiz.*?\}\);\s*\} catch.*?\s*\}\n', '', js, flags=re.DOTALL)

with open(index_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Removed the annoying test push notification from index.js.")
