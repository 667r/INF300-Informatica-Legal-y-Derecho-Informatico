TEXFILE = especificacion

# compilador
PDFLATEX = pdflatex

# target, se ejecuta al escribir make o make all
all: $(TEXFILE).pdf

$(TEXFILE).pdf: $(TEXFILE).tex
	$(PDFLATEX) $(TEXFILE).tex
	$(PDFLATEX) $(TEXFILE).tex

clean:
	rm -f *~
	rm -f $(TEXFILE).aux
	rm -f $(TEXFILE).bbl
	rm -f $(TEXFILE).blg
	rm -f $(TEXFILE).log
	rm -f $(TEXFILE).out
	rm -f $(TEXFILE).pdf
	rm -f $(TEXFILE).synctex.gz