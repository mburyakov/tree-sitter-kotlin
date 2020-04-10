# Use carefully! Review all changes made by the script.
# Usage:
# for f in corpus/*.txt; do awk -f update_tests.awk $f > "$f"_; mv "$f"_ $f; done

BEGIN          {
                 state = "parsed"
                 filenum = 0
                 fileprefix = "examples/tmp"
                 filesuffix = ".txt"
                 headersuffix = ".header"
                 parsedsuffix = ".out"
               }
$0 ~ /^={5}/   {
                 if (state == "parsed") {
                   state = "header"
                   next
                 } else {
                   state = "ready"
                   next
                 }
               }
$0 ~ /^\-{3}$/ {
                 state = "separator"
               }
               {
                 if (state == "header") {
                   print $0 > (fileprefix (filenum+1) headersuffix)
                   close(fileprefix filenum headersuffix)
                 } else if (state == "ready") {
                   if (filenum > 0) {
                     close(fileprefix filenum filesuffix)
                   }
                   filenum++
                   lastStr = $0
                   state = "code"
                 } else if (state == "code") {
                   print lastStr > (fileprefix filenum filesuffix)
                   lastStr = $0
                 } else if (state == "separator") {
                   printf lastStr > (fileprefix filenum filesuffix)
                   state = "parsed"
                 }
               }
END            {
                 for (i = 1; i <= filenum; i++) {
                   system("tree-sitter parse "(fileprefix i filesuffix)" > "(fileprefix i parsedsuffix))
                   print "=================="
                   system("cat "(fileprefix i headersuffix))
                   system("rm "(fileprefix i headersuffix))
                   print "=================="
                   system("cat "(fileprefix i filesuffix))
                   system("rm "(fileprefix i filesuffix))
                   print ""
                   print "---"
                   print ""
                   system("cat "(fileprefix i parsedsuffix)" | sed 's/ \\[.*\\]//g'")
                   system("rm "(fileprefix i parsedsuffix))
                   print ""
                 }
               }